from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.db import CanvasSnapshot, Room
from datetime import datetime

def clear_canvas_service(db: Session, room_id: str, user_id: int):
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the room owner can clear the canvas.")

    blank_state = "[]"
    new_snapshot = CanvasSnapshot(room_id=room_id, state_json=blank_state, created_by=user_id)
    db.add(new_snapshot)
    db.commit()
    return new_snapshot

def save_canvas_snapshot_service(db: Session, payload, user_email: str):
    snapshot = CanvasSnapshot(room_id=payload.room_id, state_json=payload.state_json, created_at=datetime.now())
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot

def list_snapshots_service(db: Session, room_id: str):
    snapshots = db.query(CanvasSnapshot).filter(CanvasSnapshot.room_id == room_id).order_by(CanvasSnapshot.created_at.desc()).all()
    return snapshots

def load_snapshot_service(db: Session, snapshot_id: int):
    snapshot = db.query(CanvasSnapshot).filter(CanvasSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found.")
    return snapshot

def save_canvas_state_service(db: Session, payload):
    existing = db.query(CanvasSnapshot).filter(CanvasSnapshot.room_id == payload.room_id).order_by(CanvasSnapshot.created_at.desc()).first()
    if existing:
        existing.state_json = payload.state_json
        db.commit()
        return existing
    else:
        new_state = CanvasSnapshot(room_id=payload.room_id, state_json=payload.state_json, created_at=datetime.now())
        db.add(new_state)
        db.commit()
        return new_state

def load_canvas_state_service(db: Session, room_id: str):
    latest = db.query(CanvasSnapshot).filter(CanvasSnapshot.room_id == room_id).order_by(CanvasSnapshot.created_at.desc()).first()
    return latest
