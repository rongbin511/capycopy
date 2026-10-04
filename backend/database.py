"""Catalog row models (D1-backed at runtime)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SchoolEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    school_id: str = ""
    slug: str = ""
    official_name: str = ""
    zh: str = ""
    short_name: str = ""


class SubjectEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    subject_id: str = ""
    label: str = ""
    sectionids: list[str] = Field(default_factory=list)

    def sectionids_list(self) -> list[str]:
        return [str(sid) for sid in (self.sectionids or [])]


class SectionEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    section_id: str = ""
    stem: str = ""
    label: str = ""
    title: str = ""
    interaction: str = ""
    marks: int = 0
    instruction: str = ""
    template: dict[str, Any] = Field(default_factory=dict)

    def template_dict(self) -> dict[str, Any]:
        return dict(self.template or {})


class PaperEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    paper_id: str = ""
    level: str = ""
    subject: str = ""
    year: int = 0
    term: str = ""
    school: str = ""


class UserEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user_id: str = ""
    gender: str = ""
    level: str = ""
    preference: dict[str, Any] = Field(default_factory=dict)
    last_viewed: str = ""
    role: str = ""
