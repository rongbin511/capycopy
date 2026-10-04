#!/usr/bin/env python3
"""FastAPI dev server: static site + paper JSON API.

Run from repo root::

    ./scripts/run_api_server.sh

Then open http://127.0.0.1:8000/ — the viewer loads catalog data via
``GET /api/manifest`` (papers, schools, sections) and each paper via
``GET /api/papers/{paper_id}``.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Any

try:
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import Response
    from pydantic import ValidationError
except ModuleNotFoundError:
    print(
        "Missing FastAPI. Install project deps, then use the project venv:\n"
        "  python3 -m venv .venv\n"
        "  .venv/bin/pip install -r requirements.txt\n"
        "  .venv/bin/python scripts/api_server.py",
        file=sys.stderr,
    )
    raise SystemExit(1) from None

from database import UserEntry
from models import (
    AnswersMergeBody,
    AnswerUpdateBody,
    CombinedManifest,
    CreatePrototypeBody,
    EnrichedPaperBundle,
    ImageUploadBody,
    PaperEntry,
    PassageUpdateBody,
    SchoolEntry,
    SectionNoteUpdateBody,
    SectionEntry,
    QuestionUpdateBody,
    QuestionsMergeBody,
    SchoolCreateBody,
    SchoolUpdateBody,
    SectionBucketReplaceBody,
    SectionCreateBody,
    SectionUpdateBody,
    SubjectEntry,
    SubjectCreateBody,
    SubjectUpdateBody,
    StudySectionErrorsBody,
    UserCreateBody,
    ViewerPreferencesDoc,
    ViewerPreferencesUpdateBody,
)
from common import LEVELS, TERMS
from paper import Paper
from manifest import ManifestManager
from runtime import bind, current, reset

ROOT = Path(__file__).resolve().parent.parent
PAPERS_DIR = ROOT / "papers"

app = FastAPI(title="TestPaperBuilder", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8787",
        "http://127.0.0.1:8787",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _deep_merge_dict(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    for key, val in patch.items():
        if key in base and isinstance(base[key], dict) and isinstance(val, dict):
            _deep_merge_dict(base[key], val)
        else:
            base[key] = val
    return base


def _viewer_prefs_from_user_preference(pref: dict[str, Any]) -> ViewerPreferencesDoc:
    view_mode = pref.get("viewMode")
    paper_zoom = pref.get("paperZoom")
    return ViewerPreferencesDoc(
        answerDesign=str(pref.get("answerDesign") or "plain"),
        markdownStyle=str(pref.get("markdownStyle") or "reader"),
        viewMode=view_mode if view_mode in ("study", "answers") else "study",
        showInstructions=bool(pref.get("showInstructions", False)),
        paperZoom=float(paper_zoom) if isinstance(paper_zoom, (int, float)) else 1.0,
    )



@app.middleware("http")
async def bind_worker_runtime(request: Request, call_next):
    env = request.scope.get("env")
    await bind(env)
    try:
        response = await call_next(request)
        await current().flush()
        return response
    finally:
        reset()


async def hydrate_paper_json(paper_id: str) -> None:
    probe = Paper(paper_id)
    if probe.entry is None:
        raise HTTPException(status_code=400, detail=f"Invalid paper id: {paper_id}")
    key = f"papers/{probe.entry.subject}/{probe.paper_id}/paper.json"
    data = await current().hydrate(key)
    if data is None:
        raise FileNotFoundError(f"Missing {key}")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/prototype-options")
def get_prototype_options() -> dict:
    schools = ManifestManager().read_schools()
    subjects = ManifestManager().read_subjects()
    opts = {
        "levels": list(LEVELS),
        "terms": list(TERMS),
        "subjects": [
            {"key": subject_id, "label": entry.label}
            for subject_id, entry in subjects.items()
        ],
        "schools": [
            {"schkey": school_id, "name": entry.official_name}
            for school_id, entry in schools.items()
        ],
    }
    return opts



@app.get("/api/manifest", response_model=CombinedManifest)
def get_manifest() -> CombinedManifest:
    """Return the manifest from the ORM tables."""
    try:
        return ManifestManager().combine()
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=500, detail=f"Invalid manifest data: {exc}") from exc


@app.get("/api/manifest/subjects")
def get_subjects() -> dict[str, dict[str, Any]]:
    """Return the editable subject catalog from the manifest database."""
    try:
        return ManifestManager().read_subjects()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not read subjects: {exc}") from exc


@app.post("/api/manifest/subjects")
def create_subject(body: SubjectCreateBody) -> dict:
    """Create one subject row in the manifest database."""
    try:
        mgr = ManifestManager()
        mgr.save_subject(
            SubjectEntry(
                subject_id=body.subject_id,
                label=body.label,
                sectionids=body.sectionids,
            )
        )
        subject = mgr.read_subjects().get(body.subject_id)
        if subject is None:
            raise ValueError(f"Subject '{body.subject_id}' not found.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not create subject: {exc}") from exc
    return {
        "ok": True,
        "subject_id": body.subject_id,
        "subject": subject,
    }


@app.get("/api/manifest/sections")
@app.get("/api/manifest/sections/")
def get_sections() -> dict[str, dict[str, Any]]:
    """Return the editable section catalog from the manifest database."""
    try:
        return ManifestManager().read_sections()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not read sections: {exc}") from exc


@app.get("/api/manifest/papers", response_model=list[PaperEntry])
@app.get("/api/manifest/papers/")
def get_papers() -> list[PaperEntry]:
    """Return the editable paper catalog from the manifest database."""
    try:
        return ManifestManager().list_papers()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not read papers: {exc}") from exc


@app.delete("/api/manifest/papers/{paper_id}")
@app.delete("/api/manifest/papers/{paper_id}/")
async def delete_paper(paper_id: str) -> dict:
    """Delete one paper row and its on-disk bundle folder."""
    try:
        try:
            await hydrate_paper_json(paper_id)
        except FileNotFoundError:
            pass
        ManifestManager().delete_paper(paper_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not delete paper: {exc}") from exc
    return {"ok": True, "paper_id": paper_id}


@app.get("/api/users", response_model=list[UserEntry])
@app.get("/api/users/")
def get_users() -> list[UserEntry]:
    """Return all user profiles from the database."""
    try:
        return ManifestManager().list_users()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not read users: {exc}") from exc


@app.post("/api/users")
@app.post("/api/users/")
def create_user(body: UserCreateBody) -> dict:
    """Create one user row in the database."""
    try:
        user = ManifestManager().create_user(
            UserEntry(
                user_id=body.user_id,
                gender=body.gender,
                level=body.level,
                preference=body.preference,
                last_viewed=body.last_viewed,
                role=body.role,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not create user: {exc}") from exc
    return {"ok": True, "user": user}


@app.delete("/api/users/{user_id}")
@app.delete("/api/users/{user_id}/")
def delete_user(user_id: str) -> dict:
    """Delete one user row from the database."""
    try:
        ManifestManager().delete_user(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not delete user: {exc}") from exc
    return {"ok": True, "user_id": user_id}


@app.get("/api/users/{user_id}/preferences", response_model=ViewerPreferencesDoc)
@app.get("/api/users/{user_id}/preferences/", response_model=ViewerPreferencesDoc)
def get_user_preferences(user_id: str) -> ViewerPreferencesDoc:
    """Return viewer preferences for the logged-in user profile."""
    try:
        user = ManifestManager().get_user(user_id)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not read user preferences: {exc}") from exc
    if user is None:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")
    return _viewer_prefs_from_user_preference(user.preference or {})


@app.patch("/api/users/{user_id}/preferences", response_model=ViewerPreferencesDoc)
@app.patch("/api/users/{user_id}/preferences/", response_model=ViewerPreferencesDoc)
def patch_user_preferences(user_id: str, body: ViewerPreferencesUpdateBody) -> ViewerPreferencesDoc:
    """Merge viewer preference fields into the user's ``preference`` JSON."""
    patch = body.model_dump(exclude_none=True)
    try:
        user = ManifestManager().update_user_preferences(user_id, patch)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not save user preferences: {exc}") from exc
    return _viewer_prefs_from_user_preference(user.preference or {})


@app.get("/api/manifest/schools")
def get_schools() -> dict[str, dict[str, Any]]:
    """Return the editable school catalog from the manifest database."""
    try:
        return ManifestManager().read_schools()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not read schools: {exc}") from exc


@app.post("/api/manifest/schools")
def create_school(body: SchoolCreateBody) -> dict:
    """Create one school row in the manifest database."""
    try:
        mgr = ManifestManager()
        mgr.create_school(
            SchoolEntry(
                school_id=body.school_id,
                slug=body.slug,
                official_name=body.official_name,
                zh=body.zh,
                short_name=body.short_name,
            )
        )
        school = mgr.read_schools().get(body.school_id)
        if school is None:
            raise ValueError(f"School '{body.school_id}' not found.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not create school: {exc}") from exc
    return {
        "ok": True,
        "school_id": body.school_id,
        "school": school,
    }


@app.post("/api/manifest/sections")
@app.post("/api/manifest/sections/")
def create_section(body: SectionCreateBody) -> dict:
    """Create one section row in the manifest database."""
    try:
        mgr = ManifestManager()
        mgr.create_section(
            SectionEntry(
                section_id=body.section_id,
                stem=body.stem,
                label=body.label,
                title=body.title,
                interaction=body.interaction,
                marks=body.marks,
                instruction=body.instruction,
                template=body.template,
            ),
            subject_id=body.subject_id,
        )
        section = mgr.read_sections().get(body.section_id)
        if section is None:
            raise ValueError(f"Section '{body.section_id}' not found.")
        subject = mgr.read_subjects().get(body.subject_id)
        if subject is None:
            raise ValueError(f"Subject '{body.subject_id}' not found.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not create section: {exc}") from exc
    return {
        "ok": True,
        "section_id": body.section_id,
        "section": section,
        "subject_id": body.subject_id,
        "subject": subject,
    }


@app.patch("/api/manifest/sections/{section_id}")
@app.patch("/api/manifest/sections/{section_id}/")
def update_section(section_id: str, body: SectionUpdateBody) -> dict:
    """Update one section row in the manifest database."""
    try:
        mgr = ManifestManager()
        mgr.update_section(
            section_id,
            stem=body.stem,
            label=body.label,
            title=body.title,
            interaction=body.interaction,
            marks=body.marks,
            instruction=body.instruction,
            template=body.template,
        )
        section = mgr.read_sections().get(section_id)
        if section is None:
            raise ValueError(f"Section '{section_id}' not found.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not update section: {exc}") from exc
    return {
        "ok": True,
        "section_id": section_id,
        "section": section,
    }


@app.patch("/api/manifest/subjects/{subject_id}")
@app.patch("/api/manifest/subjects/{subject_id}/")
def update_subject(subject_id: str, body: SubjectUpdateBody) -> dict:
    """Update one subject row in the manifest database."""
    try:
        mgr = ManifestManager()
        mgr.update_subject(subject_id, label=body.label, sectionids=body.sectionids)
        subject = mgr.read_subjects().get(subject_id)
        if subject is None:
            raise ValueError(f"Subject '{subject_id}' not found.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not update subject: {exc}") from exc
    return {
        "ok": True,
        "subject_id": subject_id,
        "subject": subject,
    }


@app.patch("/api/manifest/schools/{school_id}")
@app.patch("/api/manifest/schools/{school_id}/")
def update_school(school_id: str, body: SchoolUpdateBody) -> dict:
    """Update one school row in the manifest database."""
    try:
        mgr = ManifestManager()
        mgr.update_school(
            school_id,
            slug=body.slug,
            official_name=body.official_name,
            zh=body.zh,
            short_name=body.short_name,
        )
        school = mgr.read_schools().get(school_id)
        if school is None:
            raise ValueError(f"School '{school_id}' not found.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not update school: {exc}") from exc
    return {
        "ok": True,
        "school_id": school_id,
        "school": school,
    }


@app.delete("/api/manifest/schools/{school_id}")
@app.delete("/api/manifest/schools/{school_id}/")
def delete_school(school_id: str) -> dict:
    """Delete one school row from the manifest database."""
    try:
        mgr = ManifestManager()
        mgr.delete_school(school_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not delete school: {exc}") from exc
    return {
        "ok": True,
        "school_id": school_id,
    }


@app.get("/api/papers/{paper_id}", response_model=EnrichedPaperBundle)
async def get_paper(paper_id: str) -> EnrichedPaperBundle:
    """Get a paper bundle from the paper bundles."""
    try:
        await hydrate_paper_json(paper_id)
        return Paper(paper_id).enrich_bundle()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail=f"Could not read paper.json: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

def _question_slide_filename(question_id: str) -> str:
    qid = str(question_id or "").strip()
    if not qid or not qid.isdigit():
        raise HTTPException(status_code=400, detail="Question id must be numeric")
    return f"q{question_id}.jpeg"



@app.patch("/api/papers/{paper_id}/passages/{section_id}")
async def update_passage(paper_id: str, section_id: str, body: PassageUpdateBody) -> dict:
    """Merge one section passage object into ``papers/.../paper.json``."""
    paper = Paper(paper_id)
    try:
        paper.set_passage(section_id, body.passage)
        paper.save()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write paper.json: {exc}") from exc
    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": section_id,
        "path": str(paper.json_path.relative_to(ROOT)),
        "passage": body.passage,
    }


@app.put("/api/papers/{paper_id}/notes/{section_id}")
async def update_section_note(paper_id: str, section_id: str, body: SectionNoteUpdateBody) -> dict:
    """Save one section note markdown file under ``papers/<subject>/<section_id>/note.md``."""
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        paper.load()
        if section_id not in paper.doc.get("sections", {}):
            raise ValueError(f"Section {section_id} not found in paper {paper_id}")
        note_path = paper.note_file_path(section_id)
        markdown = str(body.markdown or "")
        note_path.parent.mkdir(parents=True, exist_ok=True)
        if markdown.strip():
            note_path.write_text(markdown.rstrip() + "\n", encoding="utf-8")
        elif note_path.is_file():
            note_path.unlink()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Could not read paper.json: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write note.md: {exc}") from exc
    return {
        "ok": True,
        "paper_id": paper_id,
        "subject_key": paper.subject_key,
        "section_id": section_id,
        "path": str(note_path.relative_to(ROOT)),
        "exists": note_path.is_file(),
    }


@app.patch("/api/papers/{paper_id}/questions/{section_id}")
async def merge_questions(paper_id: str, section_id: str, body: QuestionsMergeBody) -> dict:
    """Merge question objects into one section bucket (per-id deep merge; other sections untouched)."""
    if not body.questions:
        raise HTTPException(status_code=400, detail="questions object must not be empty")
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        merged_ids = paper.merge_questions(section_id, body.questions)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": section_id,
    }


@app.patch("/api/papers/{paper_id}/answers/{section_id}")
async def merge_answers(paper_id: str, section_id: str, body: AnswersMergeBody) -> dict:
    """Merge answer objects into one section bucket (per-id deep merge; other sections untouched)."""
    if not body.answers:
        raise HTTPException(status_code=400, detail="answers object must not be empty")
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)

        merged_ids = paper.merge_answers(section_id, body.answers)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": section_id,
    }


@app.patch("/api/papers/{paper_id}/answers/{section_id}/{question_id}")
async def update_answer(paper_id: str, section_id: str, question_id: str, body: AnswerUpdateBody) -> dict:
    """Update one answer row inside a section bucket."""
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        answer = dict(body.answer)
        if body.image_filename:
            answer["image"] = body.image_filename
        paper.replace_answer(section_id, question_id, answer)
        answer = (
            paper.doc.get("sections", {})
            .get(section_id, {})
            .get("answers", {})
            .get(question_id, {})
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": section_id,
        "question_id": question_id,
        "answer": answer,
    }


@app.patch("/api/papers/{paper_id}/questions/{section_id}/{question_id}")
async def update_question(paper_id: str, section_id: str, question_id: str, body: QuestionUpdateBody) -> dict:
    """Update one question row inside a section bucket."""
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        question = dict(body.question)
        if body.image_filename:
            question["image"] = body.image_filename
        paper.set_question(section_id, question_id, question)
        question = (
            paper.doc.get("sections", {})
            .get(section_id, {})
            .get("questions", {})
            .get(question_id, {})
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": section_id,
        "question_id": question_id,
        "question": question,
    }


@app.put("/api/papers/{paper_id}/question-slides/{question_id}")
async def upload_question_slide(paper_id: str, question_id: str, request: Request) -> dict:
    """Save pasted slide image beside ``paper.json`` and mark the question as having a slide."""
    filename = request.headers.get("x-image-filename", "").strip() or f"q{question_id}.jpeg"
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty image body")
    if len(body) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 12 MB)")
    qkey = str(question_id).strip()
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        section_id = paper.section_id_for_question(qkey)
        if not section_id:
            raise ValueError(f"Question not found: {qkey}")
        filename = paper.attach_question_image(section_id, qkey, body, filename=filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write paper.json: {exc}") from exc

    return {
        "ok": True,
        "paper_id": paper_id,
        "question_id": qkey,
        "filename": filename,
        "slide": True,
    }


@app.put("/api/papers/{paper_id}/answer-slides/{question_id}")
async def upload_answer_slide(paper_id: str, question_id: str, request: Request) -> dict:
    """Save a slide image beside ``paper.json`` and mark the answer row as having a slide."""
    filename = request.headers.get("x-image-filename", "").strip() or f"a{question_id}.jpeg"
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty image body")
    if len(body) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 12 MB)")
    qkey = str(question_id).strip()
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        section_id = paper.section_id_for_question(qkey)
        if not section_id:
            raise ValueError(f"Question not found: {qkey}")
        filename = paper.attach_answer_image(section_id, qkey, body, filename=filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write paper.json: {exc}") from exc

    return {
        "ok": True,
        "paper_id": paper_id,
        "question_id": qkey,
        "filename": filename,
        "slide": True,
    }


@app.put("/api/papers/{paper_id}/question-images/{question_id}")
async def upload_question_image(paper_id: str, question_id: str, request: Request) -> dict:
    """Save a question image beside ``paper.json`` and mark the question as having an image."""
    filename = request.headers.get("x-image-filename", "").strip() or f"q{question_id}.jpeg"
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty image body")
    if len(body) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 12 MB)")
    qkey = str(question_id).strip()
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        section_id = paper.section_id_for_question(qkey)
        if not section_id:
            raise ValueError(f"Question not found: {qkey}")
        filename = paper.attach_question_image(section_id, qkey, body, filename=filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write paper.json: {exc}") from exc

    return {
        "ok": True,
        "paper_id": paper_id,
        "question_id": qkey,
        "filename": filename,
        "image": True,
    }


@app.put("/api/papers/{paper_id}/images/{section_id}")
async def upload_writing_image(paper_id: str, section_id: str, request: Request) -> dict:
    """Save a section image beside ``paper.json``."""
    await hydrate_paper_json(paper_id)
    paper = Paper(paper_id)
    filebytes = await request.body()
    if not filebytes:
        raise HTTPException(status_code=400, detail="Empty image body")
    filename = request.headers.get("x-image-filename", "").strip()
    try:
        filename = paper.upload_image(section_id, filename, filebytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": section_id,
        "filename": filename,
    }


@app.put("/api/papers/{paper_id}/passage-images/{section_id}")
async def upload_passage_image(paper_id: str, section_id: str, request: Request) -> dict:
    """Save a section passage image beside ``paper.json`` and set ``passages.image`` or ``passages.images``."""
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty image body")
    if len(body) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 12 MB)")
    filename = request.headers.get("x-image-filename", "").strip()
    sid = str(section_id).strip()
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        filename = paper.attach_passage_image(sid, body, filename=filename or None)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write paper.json: {exc}") from exc
    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": sid,
        "filename": filename,
        "image": True,
    }


@app.put("/api/papers/{paper_id}/sections/{section_id}")
async def replace_paper_section(paper_id: str, section_id: str, body: SectionBucketReplaceBody) -> dict:
    """Replace one section bucket in ``papers/.../paper.json``."""
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        paper.replace_section(section_id, body.section)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write paper.json: {exc}") from exc
    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": section_id,
        "path": str(paper.json_path.relative_to(ROOT)),
    }


@app.post("/api/papers/{paper_id}/sections/{section_id}")
async def add_paper_section(paper_id: str, section_id: str) -> dict:
    """Add a passage stub for ``section_id`` when missing (sections come from the catalog + bundle content)."""
    try:
        await hydrate_paper_json(paper_id)
        paper = Paper(paper_id)
        paper.add_section(section_id)
        enriched = paper.enrich_sections()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not write paper.json: {exc}") from exc

    enriched_section = enriched.get(section_id)
    return {
        "ok": True,
        "paper_id": paper_id,
        "section_id": section_id,
        "section": enriched_section,
        "sections": enriched,
    }



@app.put("/api/papers/{paper_id}/marking/{section_id}")
async def save_study_section_errors(section_id: str, body: StudySectionErrorsBody) -> dict:
    """Persist wrong answers from Study Mark into ``papers/english/<section_stem>.json``.

    File shape: ``{ "<paper_id>": { "<question_id>": "<user answer>" } }``.
    """
    try:
        await hydrate_paper_json(body.paper_id)
        paper = Paper(body.paper_id)
        paper.marking(section_id, body.errors)
        filepath = paper.marking_file_path(section_id)
        return {
            "ok": True,
            "section_id": section_id,
            "paper_id": paper.paper_id,
            "path": str(filepath.relative_to(ROOT)),
            "errors": body.errors,
        }
    except (OSError, FileNotFoundError) as exc:
        raise HTTPException(status_code=500, detail=f"Could not write: {exc}") from exc



@app.get("/api/papers/{paper_id}/sections/{section_id}/study-pdf")
async def download_study_section_pdf(paper_id: str, section_id: str) -> Response:
    """On-demand Study PDF from JSON. Chrome/PyMuPDF are not available on Workers."""
    await hydrate_paper_json(paper_id)
    raise HTTPException(
        status_code=501,
        detail=(
            "Study PDF is generated from paper JSON when needed, but Python Workers "
            "cannot run Chrome or PyMuPDF. Use TestPaperBuilder locally for PDF export."
        ),
    )


@app.post("/api/prototype")
async def create_prototype(body: CreatePrototypeBody) -> PaperEntry:
    try:
        paper_id = (
            f"{body.level.lower()}_{body.subject_key.lower()}_"
            f"{body.year}_{body.term.lower()}_{body.school_key.lower()}"
        )
        await current().hydrate(
            f"papers/{body.subject_key.lower()}/{paper_id}/paper.json"
        )
        return Paper.create_paper(
            body.level,
            body.subject_key,
            body.year,
            body.term,
            body.school_key,
        )
    except FileExistsError as exc:
        raise HTTPException(
            status_code=409,
            detail=f"Paper already exists: {exc}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/papers/{subject}/{paper_id}/{filename:path}")
async def paper_asset(subject: str, paper_id: str, filename: str) -> Response:
    key = f"papers/{subject}/{paper_id}/{filename}"
    data = await current().hydrate(key)
    if data is None:
        raise HTTPException(status_code=404, detail="Not found")
    media = "application/octet-stream"
    lower = filename.lower()
    if lower.endswith(".json"):
        media = "application/json"
    elif lower.endswith(".md"):
        media = "text/markdown; charset=utf-8"
    elif lower.endswith((".jpeg", ".jpg")):
        media = "image/jpeg"
    elif lower.endswith(".png"):
        media = "image/png"
    elif lower.endswith(".webp"):
        media = "image/webp"
    elif lower.endswith(".gif"):
        media = "image/gif"
    return Response(content=data, media_type=media)


@app.api_route("/{path:path}", methods=["GET", "HEAD"])
async def spa_assets(path: str, request: Request):
    env = current().env
    if getattr(env, "is_local", False) or env is None or getattr(env, "ASSETS", None) is None:
        raise HTTPException(status_code=404, detail="Not found")
    resp = await env.ASSETS.fetch(request)
    status = int(resp.status)
    if status == 404:
        resp = await env.ASSETS.fetch("https://assets.local/index.html")
        status = int(resp.status)
    body = await resp.bytes()
    headers = {}
    raw_headers = getattr(resp, "headers", None)
    if raw_headers is not None:
        try:
            headers = dict(raw_headers)
        except Exception:
            headers = {}
    return Response(content=bytes(body), status_code=status, headers=headers)
