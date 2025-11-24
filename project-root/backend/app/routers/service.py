from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.db import Room, UserRoom, UserRole
import uuid

def create_room_service(db: Session, user_id: int, room_data):
    new_room_id = f"room-{str(uuid.uuid4())[:8]}"
    room = Room(
        id=new_room_id,
        name=room_data.name,
        description=room_data.description,
        owner_id=user_id,
        max_users=room_data.max_users,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    owner_membership = UserRoom(
        user_id=user_id,
        room_id=new_room_id,
        role=UserRole.OWNER
    )
    db.add(owner_membership)
    db.commit()
    return room

def join_room_service(db: Session, user_id: int, room_id: str):
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    membership = db.query(UserRoom).filter(
        UserRoom.room_id == room_id,
        UserRoom.user_id == user_id,
        UserRoom.is_active == True
    ).first()
    if membership:
        return "Already a member"
    members_count = db.query(UserRoom).filter(
        UserRoom.room_id == room_id,
        UserRoom.is_active == True
    ).count()
    if members_count >= room.max_users:
        raise HTTPException(status_code=403, detail="Room is full")
    new_member = UserRoom(
        user_id=user_id,
        room_id=room_id,
        role=UserRole.MEMBER
    )
    db.add(new_member)
    db.commit()
    return "Joined"

def leave_room_service(db: Session, user_id: int, room_id: str):
    membership = db.query(UserRoom).filter(
        UserRoom.room_id == room_id,
        UserRoom.user_id == user_id,
        UserRoom.is_active == True,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    membership.is_active = False
    db.commit()
    return "Left room"

def delete_room_service(db: Session, user_id: int, room_id: str):
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the room owner can delete this room.")
    room.is_active = False
    memberships = db.query(UserRoom).filter(UserRoom.room_id == room_id).all()
    for m in memberships:
        m.is_active = False
    db.commit()
    return "Room deleted successfully."

def remove_member_service(db: Session, owner_id: int, req):
    room = db.query(Room).filter(Room.id == req.room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Only the owner can remove a member.")
    if owner_id == req.user_id:
        raise HTTPException(status_code=403, detail="Owner cannot remove themselves.")
    membership = db.query(UserRoom).filter(
        UserRoom.room_id == req.room_id,
        UserRoom.user_id == req.user_id,
        UserRoom.is_active == True
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    membership.is_active = False
    db.commit()
    return "Member removed successfully."

def list_my_rooms_service(db: Session, user_id: int):
    memberships = db.query(UserRoom).filter(
        UserRoom.user_id == user_id, UserRoom.is_active == True
    ).all()
    result = []
    for m in memberships:
        room = db.query(Room).filter(Room.id == m.room_id).first()
        result.append({
            "room_id": room.id,
            "name": room.name,
            "role": m.role.value,
            "owner_id": room.owner_id
        })
    return result

def get_room_details_service(db: Session, room_id: str):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    members = db.query(UserRoom).filter(UserRoom.room_id == room_id, UserRoom.is_active == True).all()
    return {
        "room_id": room.id,
        "name": room.name,
        "owner_id": room.owner_id,
        "description": room.description,
        "max_users": room.max_users,
        "members": [
            {
                "user_id": m.user_id,
                "role": m.role.value
            }
            for m in members
        ],
        "is_active": room.is_active,
        "created_at": room.created_at
    }
