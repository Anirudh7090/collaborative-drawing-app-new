from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.db import get_db
from app.routers.auth import get_current_user
from pydantic import BaseModel
from .drawings_service import (
    clear_canvas_service,
    save_canvas_snapshot_service,
    list_snapshots_service,
    load_snapshot_service,
    save_canvas_state_service,
    load_canvas_state_service
)

router = APIRouter(
    prefix="/canvas",
    tags=["Canvas Persistence"]
)

# Request model for saving a snapshot
class CanvasSnapshotRequest(BaseModel):
    room_id: str
    state_json: str

# Request model for saving canvas state
class CanvasSaveRequest(BaseModel):
    room_id: str
    state_json: str

# ---- OWNER-ONLY CLEAR CANVAS ----
@router.post("/clear/{room_id}", status_code=status.HTTP_200_OK)
def clear_canvas(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_snapshot = clear_canvas_service(db, room_id, current_user["user_id"])
    return {"message": "Canvas cleared.", "room_id": room_id, "snapshot_id": new_snapshot.id}

# ---- SAVE SNAPSHOT (CREATE new version) - PROTECTED ----
@router.post("/snapshot", status_code=status.HTTP_201_CREATED)
def save_canvas_snapshot(
    payload: CanvasSnapshotRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    snapshot = save_canvas_snapshot_service(db, payload, current_user["email"])
    return {
        "message": "Snapshot saved.",
        "snapshot_id": snapshot.id,
        "created_at": snapshot.created_at,
        "saved_by": current_user["email"]
    }

# ---- LIST SNAPSHOTS FOR ROOM - PROTECTED ----
@router.get("/snapshots/{room_id}", status_code=status.HTTP_200_OK)
def list_snapshots(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    snapshots = list_snapshots_service(db, room_id)
    return [
        {
            "snapshot_id": snap.id,
            "created_at": snap.created_at,
            "room_id": snap.room_id
        }
        for snap in snapshots
    ]

# ---- LOAD SPECIFIC SNAPSHOT BY ID - PROTECTED ----
@router.get("/snapshot/{snapshot_id}", status_code=status.HTTP_200_OK)
def load_snapshot(
    snapshot_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    snapshot = load_snapshot_service(db, snapshot_id)
    return {
        "snapshot_id": snapshot.id,
        "room_id": snapshot.room_id,
        "state_json": snapshot.state_json,
        "created_at": snapshot.created_at
    }

# ---- SAVE CURRENT CANVAS STATE - PROTECTED ----
@router.post("/save", status_code=status.HTTP_201_CREATED)
def save_canvas_state(
    payload: CanvasSaveRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    state = save_canvas_state_service(db, payload)
    return {"message": "Canvas state saved", "room_id": payload.room_id}

# ---- LOAD CURRENT CANVAS STATE - PROTECTED ----
@router.get("/load/{room_id}", status_code=status.HTTP_200_OK)
def load_canvas_state(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    latest = load_canvas_state_service(db, room_id)
    if not latest:
        return {"state_json": "[]", "room_id": room_id}
    return {
        "state_json": latest.state_json,
        "room_id": latest.room_id,
        "last_updated": latest.created_at
    }
