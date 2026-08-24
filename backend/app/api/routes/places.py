from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.place import Place
from app.schemas.place import PlaceCreate, PlaceOut, PlaceUpdate

router = APIRouter(prefix="/places", tags=["places"])


@router.get("", response_model=list[PlaceOut])
async def list_places(db: DbSession, _user: CurrentUser) -> object:
    result = await db.execute(select(Place).order_by(Place.name))
    return result.scalars().all()


@router.post("", response_model=PlaceOut, status_code=status.HTTP_201_CREATED)
async def create_place(data: PlaceCreate, db: DbSession, _user: CurrentUser) -> object:
    place = Place(name=data.name)
    db.add(place)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Place name already in use"
        ) from exc
    return place


@router.patch("/{place_id}", response_model=PlaceOut)
async def update_place(
    place_id: int, data: PlaceUpdate, db: DbSession, _admin: AdminUser
) -> object:
    place = await db.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    if data.name is not None:
        place.name = data.name
    await db.commit()
    return place


@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_place(place_id: int, db: DbSession, _admin: AdminUser) -> None:
    place = await db.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    await db.delete(place)
    await db.commit()
