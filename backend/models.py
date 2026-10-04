"""Pydantic models for catalog data, paper ids, and API request/response bodies."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from database import SchoolEntry, SectionEntry, SubjectEntry, PaperEntry, UserEntry


# --- Enriched paper bundle (``GET /api/papers/{paper_id}``) ---


class EnrichedPaperDisplay(BaseModel):
    """Viewer display fields merged onto ``paper`` in API responses."""

    model_config = ConfigDict(extra="ignore")

    id: str
    year: int | str
    level: str
    subject: str
    subject_key: str
    title: str
    navTitle: str
    sectionids: list[str] = Field(default_factory=list)


class EnrichedSectionBucket(BaseModel):
    """One section bucket with catalog metadata, content, and derived answers."""

    model_config = ConfigDict(extra="allow")

    sectionid: str | int
    stem: str
    label: str
    title: str | Any = ""
    marks: int = 0
    instruction: str = ""
    questions: dict[str, Any] = Field(default_factory=dict)
    passages: dict[str, Any] = Field(default_factory=dict)
    answers: dict[str, Any] = Field(default_factory=dict)
    ui: dict[str, Any] = Field(default_factory=dict)


class EnrichedPaperBundle(BaseModel):
    """Section-bucket paper bundle returned by ``Paper.enrich_bundle()``."""

    model_config = ConfigDict(extra="allow")

    paperid: str
    paper: EnrichedPaperDisplay
    sections: dict[str, EnrichedSectionBucket] = Field(default_factory=dict)


class ChoiceEntry(BaseModel):
    """One MCQ choice row with answer-side teaching copy."""

    opt: str
    word: str
    zh: str = ""
    eg: str = ""


class ClozeUiSpec(BaseModel):
    """Section-level UI hints that the frontend can use generically."""

    show_bank: bool = False
    show_question_cards: bool = False
    items_per_line: int = 1


class McqUiSpec(BaseModel):
    """UI hints for multiple-choice sections."""

    show_passage: bool = False
    passage_mode: str = "paragraphs"
    options_per_line: int = 4


class WritingUiSpec(BaseModel):
    """UI hints for writing sections."""

    interaction: str = ""
    show_image_upload: bool = False
    allow_passage_edit: bool = False
    markdown_field: str = ""


class ViewerPreferencesDoc(BaseModel):
    """Viewer preferences stored on the logged-in user's ``preference`` column."""

    answerDesign: str = "plain"
    markdownStyle: str = "reader"
    viewMode: str = "study"
    showInstructions: bool = False
    paperZoom: float = 1.0


class ViewerPreferencesUpdateBody(BaseModel):
    """Partial payload for updating viewer preferences."""

    answerDesign: str | None = None
    markdownStyle: str | None = None
    viewMode: str | None = None
    showInstructions: bool | None = None
    paperZoom: float | None = None


class SubjectSectionsCatalogEntry(BaseModel):
    """Per-subject block in ``sections.json`` → ``subjects``."""

    label: str
    sectionids: list[str] = Field(default_factory=list)


class SectionsDoc(BaseModel):
    """On-disk ``papers/sections.json``."""

    subjects: dict[str, SubjectSectionsCatalogEntry]
    sections: dict[str, SectionEntry] = Field(default_factory=dict)


class PaperManifestEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    year: int
    level: str
    navTitle: str
    title: str
    subjectKey: str
    subject: str


class SubjectManifestBlock(BaseModel):
    """Per-subject hub block: section id list, default paper, and paper cards."""

    label: str = ""
    sectionids: list[str] = Field(default_factory=list)
    default: str = ""
    papers: list[PaperManifestEntry] = Field(default_factory=list)


class CombinedManifest(BaseModel):
    """Merged ``manifest.json`` + ``schools.json`` + ``sections.json`` for the viewer."""

    schools: dict[str, SchoolEntry] = Field(default_factory=dict)
    sections: dict[str, SectionEntry] = Field(default_factory=dict)
    subjects: dict[str, SubjectManifestBlock] = Field(default_factory=dict)


def parse_sections_catalog(raw: Any) -> dict[str, SectionEntry]:
    if not isinstance(raw, dict):
        return {}
    out: dict[str, SectionEntry] = {}
    for key, row in raw.items():
        if isinstance(row, dict) and row.get("stem"):
            out[str(key)] = SectionEntry.model_validate({**row, "section_id": str(key)})
    return out


def parse_subjects_catalog(raw: Any) -> dict[str, SubjectSectionsCatalogEntry]:
    if not isinstance(raw, dict):
        return {}
    out: dict[str, SubjectSectionsCatalogEntry] = {}
    for key, row in raw.items():
        if isinstance(row, dict):
            out[str(key)] = SubjectSectionsCatalogEntry.model_validate(row)
    return out



# --- API request bodies ---


class CreatePrototypeBody(BaseModel):
    school_key: str = Field(..., min_length=1, max_length=64)
    year: int = Field(..., ge=2000, le=2100)
    level: str = Field(default="P6", min_length=2, max_length=3)
    subject_key: str = Field(default="english", min_length=1, max_length=20)
    term: str = Field(default="sa2", min_length=1, max_length=3)



class ImageUploadBody(BaseModel):

    filename: str = Field(..., description="Image filename")
    filebytes: bytes = Field(..., description="Image file bytes")


class PassageUpdateBody(BaseModel):
    passage: dict[str, Any] = Field(..., description="Section passage object for paper.json")


class SectionNoteUpdateBody(BaseModel):
    markdown: str = Field(..., description="Markdown content for note.md")


class SubjectUpdateBody(BaseModel):
    label: str | None = Field(
        default=None,
        description="Updated subject label",
    )
    sectionids: list[str] | None = Field(
        default=None,
        description="Updated section id list",
    )


class SubjectCreateBody(BaseModel):
    subject_id: str = Field(..., min_length=1, max_length=64)
    label: str = Field(..., min_length=1, max_length=128)
    sectionids: list[str] = Field(default_factory=list)


class SchoolUpdateBody(BaseModel):
    slug: str | None = Field(
        default=None,
        description="Updated school slug",
    )
    official_name: str | None = Field(
        default=None,
        description="Updated school official name",
    )
    zh: str | None = Field(
        default=None,
        description="Updated Chinese school name",
    )
    short_name: str | None = Field(
        default=None,
        description="Updated short name",
    )


class SchoolCreateBody(BaseModel):
    school_id: str = Field(..., min_length=1, max_length=64)
    slug: str = Field(..., min_length=1, max_length=128)
    official_name: str = Field(..., min_length=1, max_length=256)
    zh: str = Field(default="")
    short_name: str = Field(default="")


class UserCreateBody(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=64)
    gender: str = Field(default="")
    level: str = Field(default="P6", min_length=2, max_length=3)
    preference: dict[str, Any] = Field(default_factory=dict)
    last_viewed: str = Field(default="")
    role: str = Field(default="")


class SectionCreateBody(BaseModel):
    subject_id: str = Field(..., min_length=1, max_length=64)
    section_id: str = Field(..., min_length=1, max_length=32)
    stem: str = Field(..., min_length=1, max_length=128)
    label: str = Field(..., min_length=1, max_length=128)
    title: str = Field(..., min_length=1, max_length=256)
    interaction: str = Field(..., min_length=1, max_length=64)
    marks: int = Field(default=0)
    instruction: str = Field(default="")
    template: dict[str, Any] = Field(default_factory=dict)


class SectionUpdateBody(BaseModel):
    stem: str | None = Field(default=None, min_length=1, max_length=128)
    label: str | None = Field(default=None, min_length=1, max_length=128)
    title: str | None = Field(default=None, min_length=1, max_length=256)
    interaction: str | None = Field(default=None, min_length=1, max_length=64)
    marks: int | None = Field(default=None)
    instruction: str | None = Field(default=None)
    template: dict[str, Any] | None = Field(default=None)


class QuestionsMergeBody(BaseModel):
    questions: dict[str, Any] = Field(
        ...,
        description="Question id → question object; merged into paper.json questions (not a full replace)",
    )


class AnswersMergeBody(BaseModel):
    answers: dict[str, Any] = Field(
        ...,
        description="Question id → answer object; merged into paper.json answers (not a full replace)",
    )


class SectionBucketReplaceBody(BaseModel):
    section: dict[str, Any] = Field(
        ...,
        description="Full section bucket for paper.json (questions, answers, passages)",
    )


class QuestionUpdateBody(BaseModel):
    question: dict[str, Any] = Field(..., description="Single question object for paper.json")
    image_filename: str | None = Field(
        default=None,
        description="Optional question image filename to persist alongside the question row",
    )

class AnswerUpdateBody(BaseModel):
    answer: dict[str, Any] = Field(..., description="Single answer object for paper.json")
    image_filename: str | None = Field(
        default=None,
        description="Optional slide image filename to persist alongside the answer row",
    )


class StudySectionErrorsBody(BaseModel):
    paper_id: str = Field(..., min_length=1, max_length=128)
    errors: dict[str, str] = Field(
        default_factory=dict,
        description="Question id → user answer (wrong answers only when marking a section)",
    )
