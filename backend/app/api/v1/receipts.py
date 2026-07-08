import os
import uuid
import shutil
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.receipt import Receipt
from app.models.expense import Expense
from app.models.category import Category
from app.models.user import User
from app.schemas.auth import ResponseEnvelope
from app.schemas.receipt import ReceiptResponse, ReceiptConvertRequest
from app.schemas.expense import ExpenseResponse
from app.tasks.ocr import process_receipt_ocr_task

router = APIRouter()


@router.post("/upload", response_model=ResponseEnvelope[ReceiptResponse])
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.content_type.startswith("image/") and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only images or PDF files are supported for receipt uploads."
        )

    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"

    local_dir = os.path.join(os.getcwd(), "static", "uploads")
    os.makedirs(local_dir, exist_ok=True)
    file_path = os.path.join(local_dir, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    receipt = Receipt(
        user_id=current_user.id,
        image_url=f"/static/uploads/{unique_filename}",
        ocr_status="pending"
    )
    db.add(receipt)
    await db.commit()
    await db.refresh(receipt)

    process_receipt_ocr_task.delay(str(receipt.id))

    return ResponseEnvelope(data=ReceiptResponse.model_validate(receipt))


@router.get("/{id}", response_model=ResponseEnvelope[ReceiptResponse])
async def get_receipt(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Receipt).where(Receipt.id == id, Receipt.user_id == current_user.id)
    )
    receipt = result.scalars().first()
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    return ResponseEnvelope(data=ReceiptResponse.model_validate(receipt))


@router.post("/{id}/convert", response_model=ResponseEnvelope[ExpenseResponse])
async def convert_receipt(
    id: UUID,
    payload: ReceiptConvertRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Receipt).where(Receipt.id == id, Receipt.user_id == current_user.id)
    )
    receipt = res.scalars().first()
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )

    if receipt.ocr_status == "converted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Receipt has already been converted to an expense."
        )

    cat_res = await db.execute(
        select(Category).where(
            Category.id == payload.category_id,
            (Category.user_id == None) | (Category.user_id == current_user.id)
        )
    )
    category = cat_res.scalars().first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    expense = Expense(
        user_id=current_user.id,
        category_id=payload.category_id,
        amount=payload.amount,
        merchant=payload.merchant,
        payment_method="card",
        date=payload.date,
        notes=payload.notes,
        receipt_id=receipt.id
    )
    db.add(expense)

    receipt.ocr_status = "converted"

    await db.commit()
    await db.refresh(expense)

    reload_res = await db.execute(
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.id == expense.id)
    )
    expense_loaded = reload_res.scalars().first()

    return ResponseEnvelope(data=ExpenseResponse.model_validate(expense_loaded))
