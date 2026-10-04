"""Paper bundle I/O: section-bucket ``paper.json`` under ``papers/<subject>/<paper_id>/``."""

from __future__ import annotations

from dataclasses import dataclass, field

import copy
import json
import re
from pathlib import Path
from typing import Any

from common import (
    TERMS, LEVELS, PAPERS_DIR,
)
from models import (
    ClozeUiSpec,
    EnrichedPaperBundle,
    EnrichedPaperDisplay,
    EnrichedSectionBucket,
    McqUiSpec,
    PaperManifestEntry,
    SubjectManifestBlock,
    WritingUiSpec,
)
from manifest import ManifestManager
from database import PaperEntry, SchoolEntry


_PAPER_ID_RE = re.compile(
    r"^([a-z]\d+)_([a-z0-9]+)_(\d{4})_([a-z0-9]+)_(.+)$",
    re.IGNORECASE,
)


def _section_catalog() -> dict[str, dict[str, Any]]:
    return ManifestManager().read_sections()


def _section_view(
    catalog: dict[str, dict[str, Any]], section_id: str
) -> dict[str, Any] | None:
    row = catalog.get(str(section_id))
    if not isinstance(row, dict):
        return None
    sid_s = str(section_id)
    sectionid = int(sid_s) if sid_s.isdigit() else row.get("section_id", sid_s)
    return {
        "sectionid": sectionid,
        "stem": str(row.get("stem") or ""),
        "label": str(row.get("label") or ""),
        "title": str(row.get("title") or ""),
        "interaction": str(row.get("interaction") or ""),
        "marks": row.get("marks"),
        "instruction": str(row.get("instruction") or ""),
    }


def _subject_info(subject_key: str) -> SubjectManifestBlock:
    row = ManifestManager().get_subject(subject_key)
    if row is None:
        return SubjectManifestBlock()
    return SubjectManifestBlock(label=row.label, sectionids=list(row.sectionids))


def _deep_merge_dict(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    for key, val in patch.items():
        if key in base and isinstance(base[key], dict) and isinstance(val, dict):
            _deep_merge_dict(base[key], val)
        else:
            base[key] = val
    return base


def _render_mode_for_template(template: dict[str, Any]) -> str:
    stem = str(template.get("stem") or "")
    interaction = str(template.get("interaction") or "")
    if stem in {"101-mcq-grammar", "102-mcq-vocab", "104-mcq-visual"}:
        return "mcq"
    if stem == "103-cloze-vocab":
        return "vocab_cloze"
    if stem == "105-cloze-grammar":
        return "grammar_cloze"
    if stem == "301-cloze_a":
        return "grammar_cloze"
    if stem == "106-editing":
        return "editing"
    if stem == "107-cloze-comprehension":
        return "comprehension_cloze"
    if stem == "108-synthesis":
        return "synthesis"
    if stem == "109-comprehension-open-ended":
        return "open_ended"
    if stem in {
        "110-writing-situational",
        "111-writing-continuous",
        "207-topic-writing",
        "208-picture-writing",
        "305-writing-one",
        "306-writing-two",
    }:
        return "writing"
    if interaction:
        return interaction
    return "generic"


def _ui_for_section(sid: str, bucket: dict[str, Any], template: dict[str, Any]) -> dict[str, Any]:
    stem = str(template.get("stem") or "")
    interaction = str(template.get("interaction") or "")
    if stem in {"101-mcq-grammar", "102-mcq-vocab"}:
        return McqUiSpec().model_dump()
    if stem == "104-mcq-visual":
        return McqUiSpec(show_passage=True, passage_mode="images", options_per_line=1).model_dump()
    if stem == "105-cloze-grammar":
        return ClozeUiSpec(show_bank=True, show_question_cards=True, items_per_line=5).model_dump()
    if stem == "301-cloze_a":
        return ClozeUiSpec(show_bank=True, show_question_cards=False, items_per_line=4).model_dump()
    if stem == "107-cloze-comprehension":
        return ClozeUiSpec(show_bank=False, show_question_cards=False).model_dump()
    if _render_mode_for_template(template) == "writing":
        questions = bucket.get("questions") if isinstance(bucket.get("questions"), dict) else {}
        writing_interaction = str(questions.get("interaction") or template.get("interaction") or "writing")
        return WritingUiSpec(
            interaction=writing_interaction,
            show_image_upload=True,
            allow_passage_edit=True,
            markdown_field="markdown",
        ).model_dump()
    return {}


@dataclass
class Paper:
    """Section-bucket paper bundle with normalize / enrich helpers."""

    paper_id: str

    doc: dict[str, Any] = field(default_factory=dict)
    json_path: Path | None = field(default=None)
    entry: PaperEntry | None = field(default=None)
    subject_info: SubjectManifestBlock | None = field(default=None)
    school_info: SchoolEntry | None = field(default=None)

    def __post_init__(self) -> None:
        """Post-initialization setup."""
        self.entry = self.parse_paper_id()
        self.json_path = self.paper_dir() / 'paper.json'
        self.subject_info = _subject_info(self.entry.subject)
        school_row = ManifestManager().get_school(self.entry.school)
        self.school_info = school_row or SchoolEntry(school_id=self.entry.school)

    def subject_dir(self) -> Path:
        """Return the directory for the subject."""
        subject_dir = PAPERS_DIR / self.entry.subject
        subject_dir.mkdir(parents=True, exist_ok=True)
        return subject_dir

    def paper_dir(self) -> Path:
        """Return the directory for the paper."""
        return self.subject_dir() / self.paper_id

    def parse_paper_id(self) -> None:
        m = _PAPER_ID_RE.match(str(self.paper_id or "").strip())
        if not m:
            return None
        self.entry = PaperEntry(
            level=m.group(1).lower(),
            subject=m.group(2).lower(),
            year=int(m.group(3)),
            term=m.group(4).lower(),
            school=m.group(5).lower(),
            paper_id=self.paper_id,
        )
        return self.entry

    def load(self) -> dict[str, Any]:
        if not self.doc:
            self.doc = json.loads(self.json_path.read_text(encoding="utf-8"))
            self._require_sections(self.doc, self.paper_id)
        return self.doc

    @staticmethod
    def _require_sections(doc: dict[str, Any], paper_id: str) -> None:
        sections = doc.get("sections")
        if not isinstance(sections, dict) or not sections:
            raise ValueError(f"Paper {paper_id} must use a sections layout")
        if not any(
            isinstance(bucket, dict) and (bucket.get("questions") or bucket.get("passages"))
            for bucket in sections.values()
        ):
            raise ValueError(f"Paper {paper_id} has no section content")

    def note_file_path(self, section_id):
        return self.subject_dir() / section_id / 'note.md'
    @property
    def subject_key(self) -> str:
        return self.entry.subject

    @classmethod
    def _template_sections(cls, subject_key: str) -> dict[str, Any]:
        """Section buckets for a new paper from ``sections.template`` in the manifest DB."""
        from_db = ManifestManager().get_subject_template(subject_key)
        if not isinstance(from_db, dict) or not from_db:
            raise ValueError(f"No sections template for subject key: {subject_key}")

        sections: dict[str, Any] = {}
        for sid, bucket in from_db.items():
            if isinstance(bucket, dict):
                sections[str(sid)] = copy.deepcopy(bucket)
            else:
                sections[str(sid)] = {"questions": {}, "passages": {}}
        return sections

    @classmethod
    def create_paper(cls, level: str, subject_key: str, year: int, term: str, school_key: str) -> Paper:
        """Create a new paper"""
        if level not in LEVELS:
            raise ValueError(f"Invalid level: {level}")
        if ManifestManager().get_subject(subject_key) is None:
            raise ValueError(f"Invalid subject key: {subject_key}")
        if not ManifestManager().get_subject_template(subject_key):
            raise ValueError(f"No template for subject key: {subject_key}")
        if year < 2000 or year > 2100:
            raise ValueError(f"Invalid year: {year}")
        if term not in TERMS:
            raise ValueError(f"Invalid term: {term}")
        if ManifestManager().get_school(school_key) is None:
            raise ValueError(f"Invalid school key: {school_key}")
        paper_id = f"{level.lower()}_{subject_key.lower()}_{year}_{term.lower()}_{school_key.lower()}"
        paper = Paper(paper_id)
        if paper.json_path.is_file():
            raise FileExistsError(paper_id)
        paper.doc = {
            "paperid": paper_id,
            "sections": cls._template_sections(subject_key),
        }
        cls._require_sections(paper.doc, paper_id)
        paper.save()
        paper.publish()
        return paper.entry

    def publish(self) -> None:
        """Publish a paper row to the manifest database."""
        ManifestManager().save_paper(self.entry)

    def marking_file_path(self, section_id: str) -> Path:
        """Return the path for the marking file."""
        return self.subject_dir() / f"{section_id}.json"

    def marking(self, section_id: str, errors: dict[str, str]) -> dict[str, Any]:
        """Mark a section with errors."""
        self.load()
        if section_id not in self.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")
        errors = {str(k).strip(): str(v) for k, v in errors.items() if str(k).strip()}
        doc: dict[str, Any] = {}
        marking_file_path = self.marking_file_path(section_id)
        if marking_file_path.is_file():
            try:
                loaded = json.loads(marking_file_path.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    doc = loaded
            except (OSError, json.JSONDecodeError) as exc:
                raise FileNotFoundError(f"Could not read {marking_file_path.name}: {exc}") from exc

        if errors:
            doc[self.paper_id] = errors
        elif self.paper_id in doc:
            del doc[self.paper_id]
        try:
            if doc:
                marking_file_path.parent.mkdir(parents=True, exist_ok=True)
                marking_file_path.write_text(
                    json.dumps(doc, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
            elif marking_file_path.is_file():
                marking_file_path.unlink()
        except OSError as exc:
            raise FileNotFoundError(f"Could not write {marking_file_path.name}: {exc}") from exc
        return doc

    def upload_image(self, section_id: str, filename: str, image_data: bytes) -> str:
        """Upload a writing image for a section."""
        if not image_data:
            raise ValueError("Empty image data")
        if len(image_data) > 12 * 1024 * 1024:
            raise ValueError("Image too large (max 12 MB)")
        self.load()
        section = self.doc.get("sections", {}).get(section_id, {})
        if not isinstance(section, dict):
            section = {}
        questions = section.get("questions", {})
        if not isinstance(questions, dict):
            questions = {}
        image_filename = str(filename or "").strip()
        if not image_filename:
            image_filename = str(questions.get("image", "")).strip()
        if not image_filename:
            raise ValueError(f"No image filename for section {section_id} of paper {self.paper_id}")
        expected_image = str(questions.get("image", "")).strip()
        if expected_image and expected_image != image_filename:
            raise ValueError(f"Image filename mismatch: {expected_image} != {image_filename}")
        image_file_path = self.paper_dir() / image_filename
        try:
            image_file_path.write_bytes(image_data)
        except OSError as exc:
            raise FileNotFoundError(f"Could not write {image_file_path.name}: {exc}") from exc
        self.save()
        return image_filename

    def attach_question_image(
        self,
        section_id: str,
        question_id: str,
        image_data: bytes,
        *,
        filename: str | None = None,
    ) -> str:
        self.load()
        if section_id not in self.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")
        if question_id not in self.doc.get("sections", {}).get(section_id, {}).get("questions", {}):
            raise ValueError(f"Question {question_id} not found in section {section_id} of paper {self.paper_id}")
        if not image_data:
            raise ValueError(
                f"Empty slide data for question {question_id} in section {section_id} of paper {self.paper_id}"
            )
        if len(image_data) > 12 * 1024 * 1024:
            raise ValueError(f"Image too large (max 12 MB): {len(image_data)} bytes")

        image_filename = str(filename or "").strip() or f"q{question_id}.jpeg"
        dest = self.paper_dir() / image_filename
        dest.write_bytes(image_data)
        self.load()
        self.doc["sections"][section_id]["questions"][question_id]["image"] = image_filename
        self.save()
        return image_filename

    def attach_answer_image(
        self,
        section_id: str,
        question_id: str,
        image_data: bytes,
        *,
        filename: str | None = None,
    ) -> str:
        self.load()
        if section_id not in self.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")
        if question_id not in self.doc.get("sections", {}).get(section_id, {}).get("answers", {}):
            raise ValueError(f"Question {question_id} not found in section {section_id} of paper {self.paper_id}")
        if not image_data:
            raise ValueError(
                f"Empty slide data for question {question_id} in section {section_id} of paper {self.paper_id}"
            )
        if len(image_data) > 12 * 1024 * 1024:
            raise ValueError(f"Image too large (max 12 MB): {len(image_data)} bytes")

        image_filename = str(filename or "").strip() or f"a{question_id}.jpeg"
        dest = self.paper_dir() / image_filename
        dest.write_bytes(image_data)
        self.doc["sections"][section_id]["answers"][question_id]["image"] = image_filename
        self.save()
        return image_filename

    def attach_passage_image(
        self,
        section_id: str,
        image_data: bytes,
        *,
        filename: str | None = None,
    ) -> str:
        """Save a passage/visual image and update ``passages.image`` or ``passages.images``."""
        self.load()
        if section_id not in self.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")
        if not image_data:
            raise ValueError(
                f"Empty passage image data for section {section_id} of paper {self.paper_id}"
            )
        if len(image_data) > 12 * 1024 * 1024:
            raise ValueError(f"Image too large (max 12 MB): {len(image_data)} bytes")

        image_filename = str(filename or "").strip() or f"{section_id}-passage.jpeg"
        dest = self.paper_dir() / image_filename
        dest.write_bytes(image_data)
        section = self.doc["sections"][section_id]
        passages = section.get("passages")
        if not isinstance(passages, dict):
            passages = {}
            section["passages"] = passages

        visual_names = {"visual1.jpeg", "visual2.jpeg"}
        use_images = image_filename in visual_names or isinstance(passages.get("images"), list)
        if use_images:
            existing = passages.get("images")
            names: list[str] = []
            if isinstance(existing, list):
                names = [str(n).strip() for n in existing if n is not None and str(n).strip()]
            if image_filename not in names:
                names.append(image_filename)
            ordered = [n for n in ("visual1.jpeg", "visual2.jpeg") if n in names]
            ordered.extend(n for n in names if n not in visual_names)
            passages["images"] = ordered
            passages.pop("image", None)
        else:
            passages["image"] = image_filename

        self.save()
        return image_filename

    def update_choice(self):
        section_id = '102'
        self.load()
        if section_id not in self.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")

        print(f'processing {self.paper_id}')
        answers = self.doc.get("sections", {}).get(section_id, {}).get("answers", {})

        for question_id, item_data in answers.items():
            print(f'normalizing {question_id}')
            choices = item_data.get("choices")
            if isinstance(choices, list):
                item_data["choices"] = [
                    choice
                    for choice in choices
                    if isinstance(choice, dict)
                ]
            self.doc["sections"][section_id]["answers"][question_id] = item_data
        self.save()
    
    def remove_choice(self, section_id = '104'):
        self.load()
        if section_id not in self.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")

        print(f'processing {self.paper_id}')
        answers = self.doc.get("sections", {}).get(section_id, {}).get("answers", {})

        for question_id, item_data in answers.items():
            print(f'normalizing {question_id}')
            choices = item_data.get("choices")
            if item_data.get("choices", None):
                item_data.pop("choices", None)
            self.doc["sections"][section_id]["answers"][question_id] = item_data
        self.save()
    def rename_answer_image(
        self,
        section_id,
    ) -> str:
        self.load()
        if section_id not in self.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")

        pattern = re.compile(r"^q(.+)\.jpeg$")
        renamed = False
        # Find and extract IDs
        for file_path in self.paper_dir().glob("q*.jpeg"):
            if match :=pattern.match(file_path.name):
                question_id = match.group(1)
                renamed = True
                image_filename =  f"a{question_id}.jpeg"
                dest = self.paper_dir() / image_filename
                file_path.rename(str(dest))
                print(f'rename file: {file_path} as {dest}')
                self.doc["sections"][section_id]["answers"][question_id]["image"] = image_filename
        self.save()
        return renamed

    def get_section_info(self, section_id: str) -> dict[str, Any]:
        row = ManifestManager().get_section(str(section_id))
        return row if isinstance(row, dict) else {}

    @classmethod
    def stem_for_sectionid(cls, sectionid: str) -> str | None:
        row = ManifestManager().get_section(str(sectionid))
        if not isinstance(row, dict):
            return None
        stem = str(row.get("stem") or "").strip()
        return stem or None

    def get_passage(self, section_id: str) -> dict[str, Any] | None:
        bucket = (self.doc.get("sections") or {}).get(section_id)
        if not isinstance(bucket, dict):
            return None
        passage = bucket.get("passages")
        return passage if isinstance(passage, dict) else None

    def add_section(self, section_id: str) -> None:
        self.load()
        
        if section_id in self.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} already exists")

        if section_id not in self.subject_info.sectionids:
            raise ValueError(f"Section {section_id} is not a valid section for {self.subject_key}")

        template = ManifestManager().get_subject_template(self.subject_key).get(section_id)
        if not isinstance(template, dict):
            raise ValueError(f"Unknown section id for {self.subject_key}: {section_id}")
        bucket = copy.deepcopy(template)
        bucket.setdefault("questions", {})
        bucket.setdefault("passages", {})
        self.doc["sections"][section_id] = bucket
        self.save()

    def set_passage(self, section_id: str, passage: dict[str, Any]) -> None:
        self.load()
        
        sections = self.doc.setdefault("sections", {})
        if not isinstance(sections, dict):
            sections = {}
            self.doc["sections"] = sections
        bucket = sections.get(section_id)
        if not isinstance(bucket, dict):
            bucket = {"questions": {}, "passages": {}}
            sections[section_id] = bucket
        bucket["passages"] = dict(passage)

    def save(self) -> None:
        self.json_path.parent.mkdir(parents=True, exist_ok=True)
        self.json_path.write_text(
            json.dumps(self.doc, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def merge_questions(
        self,
        section_id: str,
        patches: dict[str, dict[str, Any]],
    ) -> list[str]:
        self.load()
        sections = self.doc.setdefault("sections", {})
        bucket = sections.get(section_id)
        if not isinstance(bucket, dict):
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")
        questions = bucket.setdefault("questions", {})
        if not isinstance(questions, dict):
            questions = {}
            bucket["questions"] = questions
        merged_ids: list[str] = []
        for qid, patch in patches.items():
            qkey = str(qid).strip()
            if not qkey or not isinstance(patch, dict):
                continue
            if qkey in questions and isinstance(questions[qkey], dict):
                _deep_merge_dict(questions[qkey], patch)
            else:
                questions[qkey] = patch
            merged_ids.append(qkey)
        if not merged_ids:
            raise ValueError("No valid question ids in payload")
        self.save()
        return merged_ids

    def merge_answers(
        self,
        section_id: str,
        patches: dict[str, dict[str, Any]],
    ) -> list[str]:
        self.load()
        merged_ids: list[str] = []
        sections = self.doc.setdefault("sections", {})
        if not isinstance(sections, dict):
            sections = {}
            self.doc["sections"] = sections
        bucket = sections.get(section_id)
        if not isinstance(bucket, dict):
            bucket = {"questions": {}, "passages": {}}
            sections[section_id] = bucket
        all_answers = bucket.setdefault("answers", {})
        if not isinstance(all_answers, dict):
            all_answers = {}
            bucket["answers"] = all_answers
            
        if section_id in ("305", "306", "110", "111"):
            bucket["answers"] = patches
        else:
            for qid, patch in patches.items():
                qkey = str(qid).strip()
                if not qkey or not isinstance(patch, dict):
                    continue
                if qkey in all_answers and isinstance(all_answers[qkey], dict):
                    _deep_merge_dict(all_answers[qkey], patch)
                else:
                    all_answers[qkey] = patch
                merged_ids.append(qkey)
            if not merged_ids:
                raise ValueError("No valid answer ids in payload")
        self.doc["sections"][section_id] = bucket
        self.save()
        return merged_ids

    def replace_section(self, section_id: str, bucket: dict[str, Any]) -> None:
        """Replace one section bucket in ``paper.json`` (full replace, not merge)."""
        self.load()
        sections = self.doc.get("sections")
        if not isinstance(sections, dict) or section_id not in sections:
            raise ValueError(f"Section {section_id} not found in paper {self.paper_id}")
        if not isinstance(bucket, dict):
            raise ValueError("section must be a JSON object")
        normalized = copy.deepcopy(bucket)
        self.doc["sections"][section_id] = {
            "questions": normalized.get("questions") if isinstance(normalized.get("questions"), dict) else {},
            "answers": normalized.get("answers") if isinstance(normalized.get("answers"), dict) else {},
            "passages": normalized.get("passages") if isinstance(normalized.get("passages"), dict) else {},
        }
        self.save()

    def remove_item(self, section_id: str, part: str, item: str) -> bool:
        """Remove one key from ``sections[section_id][part]`` where ``part`` is ``questions`` or ``answers``."""
        self.load()

        part_key = str(part or "").strip()
        if part_key not in {"questions", "answers"}:
            raise ValueError("part must be 'questions' or 'answers'")

        sections = self.doc.get("sections", {})
        if not isinstance(sections, dict):
            sections = {}
            self.doc["sections"] = sections
        bucket = sections.get(section_id)
        if not isinstance(bucket, dict):
            return False
        target = bucket.get(part_key)
        if not isinstance(target, dict):
            return False

        item_key = str(item or "").strip()
        if not item_key:
            raise ValueError("item is required")

        for qid, qdict in target.items():
            removed = qdict.pop(item_key, None) is not None

        if removed:
            self.save()
        return removed

    def set_question(self, section_id: str, question_id: str, question: dict[str, Any]) -> None:
        """Replace one question row within a section bucket."""
        if not isinstance(question, dict):
            raise ValueError("Question must be a JSON object")
        self.load()
        questions = self.doc.get("sections", {}).get(section_id, {}).get("questions", {})
        if not isinstance(questions, dict):
            raise ValueError(f"Section {section_id} has no questions in paper {self.paper_id}")
        questions[question_id] = question
        self.save()

    def replace_answer(self, section_id: str, question_id: str, answer: dict[str, Any]) -> None:
        """Replace one answer row within a section bucket."""
        if not isinstance(answer, dict):
            raise ValueError("Answer must be a JSON object")

        self.load()

        answers = self.doc.get("sections", {}).get(section_id, {}).get("answers", {})
        if not isinstance(answers, dict):
            raise ValueError(f"Section {section_id} has no answers in paper {self.paper_id}")
        answers[question_id] = answer
        self.save()

    def section_id_for_question(self, question_id: str) -> str | None:
        """Return the section id containing ``question_id``."""
        self.load()
        qkey = str(question_id).strip()
        if not qkey:
            return None
        sections = self.doc.get("sections", {})
        if not isinstance(sections, dict):
            return None
        for sid, bucket in sections.items():
            if not isinstance(bucket, dict):
                continue
            questions = bucket.get("questions")
            if isinstance(questions, dict) and qkey in questions:
                return str(sid)
        return None
        

    def enrich_sections(self) -> dict[str, Any]:
        """Merge catalog metadata into section buckets for API responses."""
        self.load()
        catalog = _section_catalog()

        out: dict[str, Any] = {}
        for sid, bucket in (self.doc.get("sections") or {}).items():
            if not isinstance(bucket, dict):
                continue
            sid_s = str(sid)
            template = _section_view(catalog, sid_s)
            if not template:
                continue
            questions = copy.deepcopy(bucket.get("questions") or {})
            passages = copy.deepcopy(bucket.get("passages") or {})
            answers = copy.deepcopy(bucket.get("answers") or {})
            if _render_mode_for_template(template) == "writing":
                passages = {}

            out[sid_s] = {
                "sectionid": template["sectionid"],
                "stem": template["stem"],
                "label": template["label"],
                "title": template["title"],
                "marks": template["marks"],
                "instruction": template["instruction"],
                "questions": questions,
                "passages": passages,
                "answers": answers,
                "ui": _ui_for_section(sid_s, bucket, template),
            }
        return out

    def manifest_entry(self) -> PaperManifestEntry:
        """Viewer/home metadata for this paper id."""
        level = self.entry.level
        year: int | str = self.entry.year
        subj = self.subject_info.label
        slug = self.school_info.slug
        official_name = self.school_info.official_name
        return PaperManifestEntry(
            id=self.paper_id,
            year=year,
            level=level,
            navTitle=f"{slug} · {year}",
            title=f"{level} {subj} {year} {official_name}",
            subjectKey=self.entry.subject,
            subject=subj,
        )

    def enrich_bundle(self) -> EnrichedPaperBundle:
        """Return section-bucket bundle with catalog metadata and viewer display fields."""
        self.load()

        entry = self.manifest_entry()
        enriched_paper = EnrichedPaperDisplay(
            id=self.paper_id,
            year=self.entry.year,
            level=self.entry.level,
            subject=self.subject_info.label,
            subject_key=self.entry.subject,
            title=entry.title,
            navTitle=entry.navTitle,
        )
        sections_raw = self.enrich_sections()
        sections = {
            sid: EnrichedSectionBucket.model_validate(bucket)
            for sid, bucket in sections_raw.items()
            if isinstance(bucket, dict)
        }
        enriched_paper.sectionids = list(sections.keys())
        payload: dict[str, Any] = {
            "paperid": self.paper_id,
            "paper": enriched_paper,
            "sections": sections,
        }
        for key, value in self.doc.get("sections", {}).items():
            payload[key] = value
        return EnrichedPaperBundle.model_validate(payload)


if __name__ == "__main__":
    ManifestManager().combine()
