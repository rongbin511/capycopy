from __future__ import annotations

import json
from typing import Any

from database import PaperEntry, SchoolEntry, SectionEntry, SubjectEntry, UserEntry
from models import CombinedManifest, PaperManifestEntry, SubjectManifestBlock
from runtime import current


class ManifestManager:
    def _rt(self):
        return current()

    def save_subjects(self, subjects_dict):
        for subject_id, content in subjects_dict.items():
            self.save_subject(
                SubjectEntry.model_validate(
                    {
                        "subject_id": str(subject_id),
                        "label": str(content.get("label") or ""),
                        "sectionids": [str(sid) for sid in content.get("sectionids") or []],
                    }
                )
            )

    def save_subject(self, entry: SubjectEntry) -> SubjectEntry:
        rt = self._rt()
        rt.subjects[entry.subject_id] = entry
        rt.queue(
            "INSERT INTO subjects (subject_id, label, sectionids) VALUES (?, ?, ?) "
            "ON CONFLICT(subject_id) DO UPDATE SET label=excluded.label, sectionids=excluded.sectionids",
            entry.subject_id,
            entry.label,
            json.dumps(entry.sectionids_list(), ensure_ascii=False),
        )
        return entry

    def read_subjects(self) -> dict[str, SubjectEntry]:
        return dict(self._rt().subjects)

    def get_subject(self, subject_id: str) -> SubjectEntry | None:
        return self._rt().subjects.get(str(subject_id))

    def update_subject(self, subject_id, label=None, sectionids=None):
        rt = self._rt()
        subject = rt.subjects.get(str(subject_id))
        if subject is None:
            raise ValueError(f"Subject '{subject_id}' not found.")
        if label is not None:
            subject.label = str(label)
        if sectionids is not None:
            subject.sectionids = [str(sid) for sid in sectionids]
        self.save_subject(subject)

    def delete_subject(self, subject_id):
        rt = self._rt()
        if str(subject_id) not in rt.subjects:
            raise ValueError(f"Cannot delete. Subject '{subject_id}' does not exist.")
        del rt.subjects[str(subject_id)]
        rt.queue("DELETE FROM subjects WHERE subject_id = ?", str(subject_id))

    def save_schools(self, schools_dict):
        for school_id, content in schools_dict.items():
            self.create_school(
                SchoolEntry.model_validate({"school_id": str(school_id), **content}),
                _upsert=True,
            )

    def create_school(self, school: SchoolEntry | dict[str, Any], _upsert: bool = False):
        if isinstance(school, dict):
            school = SchoolEntry.model_validate(school)
        rt = self._rt()
        if not _upsert and school.school_id in rt.schools:
            raise ValueError(f"School '{school.school_id}' already exists.")
        rt.schools[school.school_id] = school
        rt.queue(
            "INSERT INTO schools (school_id, slug, official_name, zh, short_name) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(school_id) DO UPDATE SET slug=excluded.slug, official_name=excluded.official_name, "
            "zh=excluded.zh, short_name=excluded.short_name",
            school.school_id,
            school.slug,
            school.official_name,
            school.zh,
            school.short_name,
        )

    def create_section(self, section: SectionEntry | dict[str, Any], subject_id: str | None = None):
        if isinstance(section, dict):
            section = SectionEntry.model_validate(section)
        rt = self._rt()
        if str(section.section_id) in rt.sections:
            raise ValueError(f"Section '{section.section_id}' already exists.")
        rt.sections[str(section.section_id)] = section
        rt.queue(
            "INSERT INTO sections (section_id, stem, label, title, interaction, marks, instruction, template) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            str(section.section_id),
            section.stem,
            section.label,
            section.title,
            section.interaction,
            int(section.marks or 0),
            section.instruction,
            json.dumps(section.template or {}, ensure_ascii=False),
        )
        if subject_id is not None:
            subject = rt.subjects.get(str(subject_id))
            if subject is None:
                raise ValueError(f"Subject '{subject_id}' not found.")
            ids = subject.sectionids_list()
            if str(section.section_id) not in ids:
                ids.append(str(section.section_id))
                subject.sectionids = ids
                self.save_subject(subject)

    def get_school(self, school_id: str) -> SchoolEntry | None:
        return self._rt().schools.get(str(school_id))

    def update_school(self, school_id, slug=None, official_name=None, zh=None, short_name=None):
        school = self.get_school(school_id)
        if school is None:
            raise ValueError(f"School '{school_id}' not found.")
        if slug is not None:
            school.slug = str(slug)
        if official_name is not None:
            school.official_name = str(official_name)
        if zh is not None:
            school.zh = str(zh)
        if short_name is not None:
            school.short_name = str(short_name)
        self.create_school(school, _upsert=True)

    def delete_school(self, school_id):
        rt = self._rt()
        if str(school_id) not in rt.schools:
            raise ValueError(f"School '{school_id}' does not exist.")
        del rt.schools[str(school_id)]
        rt.queue("DELETE FROM schools WHERE school_id = ?", str(school_id))

    def read_schools(self) -> dict[str, SchoolEntry]:
        return dict(self._rt().schools)

    def read_sections(self) -> dict[str, SectionEntry]:
        return dict(self._rt().sections)

    def get_section(self, section_id: str) -> dict[str, Any] | None:
        row = self._rt().sections.get(str(section_id))
        return row.model_dump() if row is not None else None

    def update_section(self, section_id, stem=None, label=None, title=None,
                       interaction=None, marks=None, instruction=None, template=None):
        rt = self._rt()
        section = rt.sections.get(str(section_id))
        if section is None:
            raise ValueError(f"Section '{section_id}' not found.")
        if stem is not None:
            section.stem = str(stem)
        if label is not None:
            section.label = str(label)
        if title is not None:
            section.title = str(title)
        if interaction is not None:
            section.interaction = str(interaction)
        if marks is not None:
            section.marks = int(marks)
        if instruction is not None:
            section.instruction = str(instruction)
        if template is not None:
            section.template = dict(template)
        rt.sections[str(section_id)] = section
        rt.queue(
            "UPDATE sections SET stem=?, label=?, title=?, interaction=?, marks=?, instruction=?, template=? "
            "WHERE section_id=?",
            section.stem,
            section.label,
            section.title,
            section.interaction,
            int(section.marks or 0),
            section.instruction,
            json.dumps(section.template or {}, ensure_ascii=False),
            str(section_id),
        )

    def save_paper(self, paper: PaperEntry):
        rt = self._rt()
        rt.papers[paper.paper_id] = paper
        rt.queue(
            "INSERT INTO papers (paper_id, level, subject, year, term, school) VALUES (?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(paper_id) DO UPDATE SET level=excluded.level, subject=excluded.subject, "
            "year=excluded.year, term=excluded.term, school=excluded.school",
            paper.paper_id,
            paper.level,
            paper.subject,
            int(paper.year or 0),
            paper.term,
            paper.school,
        )

    def get_subject_template(self, subject_key: str) -> dict[str, Any]:
        subject = self.get_subject(subject_key)
        if subject is None:
            return {}
        out = {}
        for sid in subject.sectionids_list():
            section = self._rt().sections.get(str(sid))
            if section is not None:
                out[str(sid)] = section.template_dict()
        return out

    def read_papers(self) -> dict[str, list[PaperEntry]]:
        grouped: dict[str, list[PaperEntry]] = {}
        for paper in self._rt().papers.values():
            grouped.setdefault(paper.subject, []).append(paper)
        return grouped

    def list_papers(self) -> list[PaperEntry]:
        return sorted(self._rt().papers.values(), key=lambda p: p.paper_id)

    def combine(self) -> CombinedManifest:
        stored_subjects = self.read_subjects()
        stored_schools = self.read_schools()
        stored_sections = self.read_sections()
        stored_papers = self.read_papers()
        subjects: dict[str, SubjectManifestBlock] = {}
        for subject_key in sorted(stored_subjects):
            subject_entry = stored_subjects[subject_key]
            paper_cards: list[PaperManifestEntry] = []
            for paper in stored_papers.get(subject_key, []):
                school_entry = stored_schools.get(paper.school)
                if school_entry is None:
                    continue
                paper_cards.append(
                    PaperManifestEntry(
                        id=str(paper.paper_id),
                        year=paper.year,
                        level=paper.level,
                        navTitle=f"{school_entry.slug} · {paper.year}",
                        title=" ".join(
                            [paper.level, subject_entry.label, str(paper.year), school_entry.official_name]
                        ),
                        subjectKey=paper.subject,
                        subject=subject_entry.label,
                    )
                )
            subjects[str(subject_key)] = SubjectManifestBlock(
                label=str(subject_entry.label or ""),
                sectionids=[str(section_id) for section_id in subject_entry.sectionids],
                papers=paper_cards,
            )
        return CombinedManifest(
            schools=stored_schools,
            sections=stored_sections,
            subjects=subjects,
        )

    def delete_paper(self, paper_id):
        rt = self._rt()
        if str(paper_id) not in rt.papers:
            raise ValueError(f"Paper '{paper_id}' does not exist.")
        del rt.papers[str(paper_id)]
        rt.queue("DELETE FROM papers WHERE paper_id = ?", str(paper_id))

    def list_users(self) -> list[UserEntry]:
        return sorted(self._rt().users.values(), key=lambda u: u.user_id)

    def get_user(self, user_id: str) -> UserEntry | None:
        return self._rt().users.get(str(user_id))

    def create_user(self, user: UserEntry | dict[str, Any]) -> UserEntry:
        if isinstance(user, dict):
            user = UserEntry.model_validate(user)
        rt = self._rt()
        if user.user_id in rt.users:
            raise ValueError(f"User '{user.user_id}' already exists.")
        rt.users[user.user_id] = user
        rt.queue(
            "INSERT INTO users (user_id, gender, level, preference, last_viewed, role) VALUES (?, ?, ?, ?, ?, ?)",
            user.user_id,
            user.gender,
            user.level,
            json.dumps(user.preference or {}, ensure_ascii=False),
            user.last_viewed,
            user.role,
        )
        return user

    def delete_user(self, user_id: str) -> None:
        rt = self._rt()
        if str(user_id) not in rt.users:
            raise ValueError(f"User '{user_id}' does not exist.")
        del rt.users[str(user_id)]
        rt.queue("DELETE FROM users WHERE user_id = ?", str(user_id))

    def update_user_preferences(self, user_id: str, patch: dict[str, Any]) -> UserEntry:
        rt = self._rt()
        user = rt.users.get(str(user_id))
        if user is None:
            raise ValueError(f"User '{user_id}' not found.")
        current_pref = dict(user.preference or {})
        for key, val in patch.items():
            if val is not None:
                current_pref[key] = val
        user.preference = current_pref
        rt.queue(
            "UPDATE users SET preference = ? WHERE user_id = ?",
            json.dumps(current_pref, ensure_ascii=False),
            str(user_id),
        )
        return user
