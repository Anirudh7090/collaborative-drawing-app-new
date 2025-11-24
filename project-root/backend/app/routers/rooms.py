from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.db import get_db
from app.models.users import User
from app.routers.auth import get_current_user
from pydantic import BaseModel
from .service import (
    create_room_service,
    join_room_service,
    leave_room_service,
    delete_room_service,
    remove_member_service,
    list_my_rooms_service,
    get_room_details_service
)
import uuid

router = APIRouter(
    prefix="/rooms",
    tags=["Rooms"]
)

# Pydantic schemas
class RoomCreateRequest(BaseModel):
    name: str
    description: str | None = None
    max_users: int = 10

class JoinRoomRequest(BaseModel):
    room_id: str

class RemoveMemberRequest(BaseModel):
    room_id: str
    user_id: int

# ---- CREATE ROOM ----
@router.post("/create", status_code=201)
def create_room(
    room_data: RoomCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = create_room_service(db, current_user["user_id"], room_data)
    return {
        "room_id": room.id,
        "name": room.name,
        "description": room.description,
        "owner_id": room.owner_id
    }

# ---- JOIN ROOM ----
@router.post("/join", status_code=200)
def join_room(
    join_data: JoinRoomRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = join_room_service(db, current_user["user_id"], join_data.room_id)
    return {"message": result, "room_id": join_data.room_id}

# ---- LEAVE ROOM ----
@router.post("/leave/{room_id}", status_code=200)
def leave_room(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = leave_room_service(db, current_user["user_id"], room_id)
    return {"message": result, "room_id": room_id}

# ---- DELETE ROOM (OWNER ONLY) ----
@router.delete("/{room_id}", status_code=200)
def delete_room(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = delete_room_service(db, current_user["user_id"], room_id)
    return {"message": result}

# ---- REMOVE MEMBER (OWNER ONLY) ----
@router.post("/remove_member", status_code=200)
def remove_member(
    req: RemoveMemberRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = remove_member_service(db, current_user["user_id"], req)
    return {"message": result}

# ---- CLEAR CANVAS (OWNER ONLY, calls drawings router logic) ----
@router.post("/clear_canvas/{room_id}", status_code=200)
def clear_canvas(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.owner_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Only owner can clear the canvas.")
    return {"message": "Canvas clear requested. (Implement in drawings.py)."}

# ---- LIST ROOMS FOR CURRENT USER ----
@router.get("/my", status_code=200)
def list_my_rooms(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = list_my_rooms_service(db, current_user["user_id"])
    return result

# ---- GET ROOM DETAILS ----
@router.get("/{room_id}", status_code=200)
def get_room_details(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = get_room_details_service(db, room_id)
    return result
