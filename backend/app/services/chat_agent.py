import os
import uuid
import re
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.expense import Expense
from app.models.category import Category
from app.models.budget import Budget
from app.models.income import Income

# =====================================================================
# Core DB Tools (Async execution)
# =====================================================================

async def list_expenses_tool(db: AsyncSession, user_id: uuid.UUID, limit: int = 10) -> str:
    stmt = (
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.user_id == user_id)
        .order_by(Expense.date.desc(), Expense.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    expenses = result.scalars().all()
    if not expenses:
        return "No expenses found in your logs."
    
    lines = []
    for e in expenses:
        category_name = e.category.name if e.category else "Uncategorized"
        lines.append(f"- {e.date}: {e.merchant} - ₹{e.amount:.2f} ({category_name})")
    return "\n".join(lines)


async def list_budgets_tool(db: AsyncSession, user_id: uuid.UUID, period: str = None) -> str:
    if not period:
        period = datetime.now().strftime("%Y-%m")
    
    stmt = (
        select(Budget)
        .options(selectinload(Budget.category))
        .where(and_(Budget.user_id == user_id, Budget.period == period))
    )
    result = await db.execute(stmt)
    budgets = result.scalars().all()
    if not budgets:
        return f"No budgets set for period {period}."
    
    lines = []
    for b in budgets:
        category_name = b.category.name if b.category else "Unknown"
        lines.append(f"- {category_name}: Limit ₹{b.amount_limit:.2f} (Period: {b.period})")
    return "\n".join(lines)


async def get_analytics_summary_tool(db: AsyncSession, user_id: uuid.UUID, period: str = None) -> str:
    if not period:
        period = datetime.now().strftime("%Y-%m")
    
    try:
        start_date = datetime.strptime(f"{period}-01", "%Y-%m-%d").date()
        year, month = map(int, period.split("-"))
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
    except ValueError:
        return f"Invalid period format: {period}. Use YYYY-MM."
        
    stmt_exp = (
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(
            and_(
                Expense.user_id == user_id,
                Expense.date >= start_date,
                Expense.date < end_date
            )
        )
    )
    res_exp = await db.execute(stmt_exp)
    total_spent = res_exp.scalar() or Decimal("0.0")

    stmt_inc = (
        select(func.coalesce(func.sum(Income.amount), 0))
        .where(
            and_(
                Income.user_id == user_id,
                Income.date >= start_date,
                Income.date < end_date
            )
        )
    )
    res_inc = await db.execute(stmt_inc)
    total_income = res_inc.scalar() or Decimal("0.0")

    savings = total_income - total_spent
    savings_rate = (savings / total_income * 100) if total_income > 0 else Decimal("0.0")

    return (
        f"Analytics Summary for {period}:\n"
        f"- Total Income: ₹{total_income:.2f}\n"
        f"- Total Expenses: ₹{total_spent:.2f}\n"
        f"- Net Savings: ₹{savings:.2f}\n"
        f"- Savings Rate: {savings_rate:.1f}%"
    )


async def create_expense_tool(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: float,
    category_name: str,
    merchant: str,
    date_str: str = None,
    payment_method: str = None
) -> str:
    try:
        # Resolve category
        stmt = select(Category).where(
            and_(
                Category.name.ilike(category_name),
                (Category.user_id == user_id) | (Category.is_default == True)
            )
        ).limit(1)
        res = await db.execute(stmt)
        category = res.scalar()
        if not category:
            category = Category(
                name=category_name.capitalize(),
                icon="Tag",
                color="#8B5CF6",
                is_default=False,
                user_id=user_id
            )
            db.add(category)
            await db.flush()
        
        parsed_date = date.today()
        if date_str:
            try:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                pass
                
        expense = Expense(
            user_id=user_id,
            category_id=category.id,
            amount=Decimal(str(amount)),
            merchant=merchant,
            payment_method=(payment_method.lower() if payment_method else "other"),
            date=parsed_date,
            notes="Logged via AI Chat Assistant"
        )
        db.add(expense)
        await db.commit()
        return f"Successfully logged expense: ₹{amount:.2f} at {merchant} under '{category.name}' using {(payment_method or 'other').upper()} on {parsed_date}."
    except Exception as e:
        await db.rollback()
        return f"Failed to log expense: {str(e)}"


async def delete_expense_tool(
    db: AsyncSession,
    user_id: uuid.UUID,
    expense_id: str = None,
    merchant: str = None,
    date_str: str = None,
    category_name: str = None,
    amount: float = None
) -> str:
    try:
        query = select(Expense).where(Expense.user_id == user_id)
        
        if expense_id:
            try:
                exp_uuid = uuid.UUID(expense_id)
                query = query.where(Expense.id == exp_uuid)
            except ValueError:
                return "Invalid expense ID format."
        else:
            if merchant:
                query = query.where(Expense.merchant.ilike(f"%{merchant}%"))
            if date_str:
                try:
                    parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                    query = query.where(Expense.date == parsed_date)
                except ValueError:
                    pass
            if category_name:
                query = query.join(Category).where(Category.name.ilike(category_name))
            if amount is not None:
                query = query.where(Expense.amount == Decimal(str(amount)))
                
        result = await db.execute(query)
        expenses = result.scalars().all()
        
        if not expenses:
            return "No matching expense was found to delete. Please specify more precise details."
            
        if len(expenses) > 1:
            options = []
            for exp in expenses:
                cat_name = exp.category.name if exp.category else "Uncategorized"
                options.append(f"- ID: {exp.id}, Merchant: {exp.merchant}, Amount: ₹{exp.amount:.2f}, Date: {exp.date} ({cat_name})")
            options_str = "\n".join(options)
            return f"Found multiple matching expenses. Please specify the exact date, amount, or merchant:\n{options_str}"
            
        expense_to_delete = expenses[0]
        merchant_name = expense_to_delete.merchant
        deleted_amount = expense_to_delete.amount
        deleted_date = expense_to_delete.date
        
        await db.delete(expense_to_delete)
        await db.commit()
        return f"Successfully deleted expense: ₹{deleted_amount:.2f} at {merchant_name} on {deleted_date}."
    except Exception as e:
        await db.rollback()
        return f"Failed to delete expense: {str(e)}"


async def update_expense_tool(
    db: AsyncSession,
    user_id: uuid.UUID,
    expense_id: str = None,
    search_merchant: str = None,
    search_date_str: str = None,
    search_category_name: str = None,
    search_amount: float = None,
    new_amount: float = None,
    new_merchant: str = None,
    new_category_name: str = None,
    new_date_str: str = None,
    new_notes: str = None,
    new_payment_method: str = None
) -> str:
    try:
        query = select(Expense).where(Expense.user_id == user_id)
        
        if expense_id:
            try:
                exp_uuid = uuid.UUID(expense_id)
                query = query.where(Expense.id == exp_uuid)
            except ValueError:
                return "Invalid expense ID format."
        else:
            if search_merchant:
                query = query.where(Expense.merchant.ilike(f"%{search_merchant}%"))
            if search_date_str:
                try:
                    parsed_date = datetime.strptime(search_date_str, "%Y-%m-%d").date()
                    query = query.where(Expense.date == parsed_date)
                except ValueError:
                    pass
            if search_category_name:
                query = query.join(Category).where(Category.name.ilike(search_category_name))
            if search_amount is not None:
                query = query.where(Expense.amount == Decimal(str(search_amount)))
                
        result = await db.execute(query)
        expenses = result.scalars().all()
        
        if not expenses:
            return "No matching expense was found to update. Please specify more precise search criteria."
            
        if len(expenses) > 1:
            options = []
            for exp in expenses:
                cat_name = exp.category.name if exp.category else "Uncategorized"
                options.append(f"- ID: {exp.id}, Merchant: {exp.merchant}, Amount: ₹{exp.amount:.2f}, Date: {exp.date} ({cat_name})")
            options_str = "\n".join(options)
            return f"Found multiple matching expenses. Please specify the exact ID, date, amount, or merchant:\n{options_str}"
            
        expense_to_update = expenses[0]
        original_details = f"₹{expense_to_update.amount:.2f} at {expense_to_update.merchant} on {expense_to_update.date}"
        
        updates = []
        if new_amount is not None:
            expense_to_update.amount = Decimal(str(new_amount))
            updates.append(f"Amount to ₹{new_amount:.2f}")
        if new_merchant:
            expense_to_update.merchant = new_merchant
            updates.append(f"Merchant to '{new_merchant}'")
        if new_category_name:
            stmt = select(Category).where(
                and_(
                    Category.name.ilike(new_category_name),
                    (Category.user_id == user_id) | (Category.is_default == True)
                )
            ).limit(1)
            res = await db.execute(stmt)
            category = res.scalar()
            if not category:
                category = Category(
                    name=new_category_name.capitalize(),
                    icon="Tag",
                    color="#8B5CF6",
                    is_default=False,
                    user_id=user_id
                )
                db.add(category)
                await db.flush()
            expense_to_update.category_id = category.id
            updates.append(f"Category to '{category.name}'")
        if new_date_str:
            try:
                parsed_date = datetime.strptime(new_date_str, "%Y-%m-%d").date()
                expense_to_update.date = parsed_date
                updates.append(f"Date to {parsed_date}")
            except ValueError:
                return "Invalid new date format YYYY-MM-DD."
        if new_notes:
            expense_to_update.notes = new_notes
            updates.append("Notes updated")
        if new_payment_method:
            expense_to_update.payment_method = new_payment_method.lower()
            updates.append(f"Payment Method to '{new_payment_method.upper()}'")
            
        if not updates:
            return f"No update parameters specified. Expense remains unchanged: {original_details}."
            
        await db.commit()
        return f"Successfully updated expense (originally {original_details}): changed " + ", ".join(updates) + "."
    except Exception as e:
        await db.rollback()
        return f"Failed to update expense: {str(e)}"



async def create_budget_tool(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: float,
    category_name: str,
    period: str = None
) -> str:
    try:
        if not period:
            period = datetime.now().strftime("%Y-%m")
            
        stmt = select(Category).where(
            and_(
                Category.name.ilike(category_name),
                (Category.user_id == user_id) | (Category.is_default == True)
            )
        ).limit(1)
        res = await db.execute(stmt)
        category = res.scalar()
        if not category:
            category = Category(
                name=category_name.capitalize(),
                icon="Layers",
                color="#10B981",
                is_default=False,
                user_id=user_id
            )
            db.add(category)
            await db.flush()
            
        stmt_b = select(Budget).where(
            and_(
                Budget.user_id == user_id,
                Budget.category_id == category.id,
                Budget.period == period
            )
        )
        res_b = await db.execute(stmt_b)
        budget = res_b.scalar()
        if budget:
            budget.amount_limit = Decimal(str(amount))
        else:
            budget = Budget(
                user_id=user_id,
                category_id=category.id,
                amount_limit=Decimal(str(amount)),
                period=period
            )
            db.add(budget)
            
        await db.commit()
        return f"Successfully set budget of ₹{amount:.2f} for category '{category.name}' in period {period}."
    except Exception as e:
        await db.rollback()
        return f"Failed to set budget: {str(e)}"


# =====================================================================
# Local Simulation Fallback
# =====================================================================

async def mock_agent_stream(prompt: str, db: AsyncSession, user_id: uuid.UUID):
    prompt_lower = prompt.lower()
    
    if "expense" in prompt_lower or "spent" in prompt_lower:
        words = set(re.findall(r'\b\w+\b', prompt_lower))
        if any(keyword in words for keyword in ["delete", "remove", "cancel"]):
            amount_match = re.search(r'(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d{1,2})?)', prompt_lower)
            amount = float(amount_match.group(1)) if amount_match else None
            
            merchant = None
            merchant_match = re.search(r'(?:at|from|to)\s+([a-zA-Z0-9\s/:]+)', prompt)
            if merchant_match:
                merchant = re.sub(r'yesterday|today|\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}', '', merchant_match.group(1), flags=re.IGNORECASE).strip()
            
            date_str = None
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', prompt_lower)
            if date_match:
                date_str = date_match.group(1)
            elif "yesterday" in prompt_lower:
                from datetime import timedelta
                date_str = (date.today() - timedelta(days=1)).isoformat()
                
            result = await delete_expense_tool(db, user_id, merchant=merchant, date_str=date_str, amount=amount)
            yield f"🤖 *Simulation Mode (No API Key)*:\n\n{result}"
            
        elif any(keyword in words for keyword in ["change", "update", "modify", "correct"]):
            new_amount_match = re.search(r'(?:to|of|be)\s+(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d{1,2})?)', prompt_lower)
            new_amount = float(new_amount_match.group(1)) if new_amount_match else None
            
            new_payment_method = None
            for pm in ["cash", "card", "upi", "netbanking", "wallet"]:
                if pm in prompt_lower:
                    new_payment_method = pm
                    break
            
            search_merchant = None
            merchant_match = re.search(r'(?:for|at|from|to)\s+([a-zA-Z0-9\s/:]+)', prompt)
            if merchant_match:
                search_merchant = re.sub(r'yesterday|today|\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}', '', merchant_match.group(1), flags=re.IGNORECASE).strip()
                
            result = await update_expense_tool(db, user_id, search_merchant=search_merchant, new_amount=new_amount, new_payment_method=new_payment_method)
            yield f"🤖 *Simulation Mode (No API Key)*:\n\n{result}"
            
        elif any(keyword in words for keyword in ["log", "add", "create", "new", "record"]):
            # Split by conjunctions to identify multiple expenses
            segments = re.split(r'\band\b|\balso\b|\bthen\b|,', prompt)
            expenses_logged = []
            
            for seg in segments:
                seg_lower = seg.lower()
                amount_match = re.search(r'(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d{1,2})?)', seg_lower)
                if amount_match:
                    amount = float(amount_match.group(1))
                    
                    merchant = "Store"
                    merchant_match = re.search(r'(?:at|from|to)\s+([a-zA-Z0-9\s/:]+)', seg)
                    if merchant_match:
                        merchant = re.sub(r'yesterday|today|\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}', '', merchant_match.group(1), flags=re.IGNORECASE).strip()
                    
                    category = "Other"
                    for cat in ["food", "rent", "travel", "coffee", "groceries", "utilities", "shopping", "entertainment"]:
                        if cat in seg_lower:
                            category = cat
                            break
                            
                    payment_method = "other"
                    for pm in ["cash", "card", "upi", "netbanking", "wallet"]:
                        if pm in seg_lower:
                            payment_method = pm
                            break
                            
                    # Parse dates for individual segment if specified
                    date_str = date.today().isoformat()
                    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', seg)
                    if date_match:
                        date_str = date_match.group(1)
                    elif "yesterday" in seg_lower:
                        from datetime import timedelta
                        date_str = (date.today() - timedelta(days=1)).isoformat()
                    
                    result = await create_expense_tool(db, user_id, amount, category, merchant, date_str, payment_method)
                    expenses_logged.append(result)
            
            if expenses_logged:
                yield f"🤖 *Simulation Mode (No API Key)*:\n\n" + "\n".join(expenses_logged)
            else:
                yield "🤖 *Simulation Mode (No API Key)*:\n\nCould not parse expense details. Please specify an amount and a merchant or description."
        else:
            result = await list_expenses_tool(db, user_id)
            yield f"🤖 *Simulation Mode (No API Key)*:\n\nHere are your recent expenses:\n{result}"
            
    elif "budget" in prompt_lower:
        words = set(re.findall(r'\b\w+\b', prompt_lower))
        if any(keyword in words for keyword in ["set", "add", "create", "limit"]):
            amount_match = re.search(r'(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d{1,2})?)', prompt_lower)
            amount = float(amount_match.group(1)) if amount_match else 5000.0
            
            category = "Other"
            for cat in ["food", "rent", "travel", "coffee", "groceries", "utilities", "shopping", "entertainment"]:
                if cat in prompt_lower:
                    category = cat
                    break
            result = await create_budget_tool(db, user_id, amount, category)
            yield f"🤖 *Simulation Mode (No API Key)*:\n\n{result}"
        else:
            result = await list_budgets_tool(db, user_id)
            yield f"🤖 *Simulation Mode (No API Key)*:\n\nHere are your active budgets:\n{result}"
            
    elif any(keyword in prompt_lower for keyword in ["analytics", "summary", "saving", "income"]):
        result = await get_analytics_summary_tool(db, user_id)
        yield f"🤖 *Simulation Mode (No API Key)*:\n\n{result}"
        
    else:
        yield "🤖 *Simulation Mode (No API Key)*:\n\nHello! I am your FinAI assistant. You can ask me to:\n" \
              "- **List recent expenses** (e.g., 'show my expenses')\n" \
              "- **Log a new expense** (e.g., 'log coffee expense of ₹150 at Cafe')\n" \
              "- **Show budgets** (e.g., 'what are my budgets?')\n" \
              "- **Set a budget** (e.g., 'set budget of ₹5000 for groceries')\n" \
              "- **Check analytics** (e.g., 'show monthly summary')"


# =====================================================================
# Gemini Real API Integrations
# =====================================================================

# Define python function schemas for Gemini API registrations:
def list_expenses(limit: int = 10) -> str:
    """
    List the user's recent expenses logs.
    
    Args:
        limit: The maximum number of recent expenses to list.
    """
    return ""

def list_budgets(period: str = None) -> str:
    """
    List active budget limits for the month (format YYYY-MM).
    
    Args:
        period: The month period in 'YYYY-MM' format. Defaults to current month if None.
    """
    return ""

def get_analytics_summary(period: str = None) -> str:
    """
    Get financial analytics (income, total spent, savings, rate) for a month (format YYYY-MM).
    
    Args:
        period: The month period in 'YYYY-MM' format. Defaults to current month if None.
    """
    return ""

def create_expense(amount: float, category_name: str, merchant: str, date_str: str = None, payment_method: str = None) -> str:
    """
    Log a new expense.
    
    Args:
        amount: The expense amount decimal number.
        category_name: The category category (e.g., Food, Travel, Rent).
        merchant: The place or person paid.
        date_str: Date of expense in YYYY-MM-DD format. Defaults to today if None.
        payment_method: Payment method used (e.g. Cash, Card, UPI, Netbanking, Wallet, Other).
    """
    return ""

def update_expense(
    expense_id: str = None,
    search_merchant: str = None,
    search_date_str: str = None,
    search_category_name: str = None,
    search_amount: float = None,
    new_amount: float = None,
    new_merchant: str = None,
    new_category_name: str = None,
    new_date_str: str = None,
    new_notes: str = None,
    new_payment_method: str = None
) -> str:
    """
    Modify or update details of an existing logged expense.
    
    Args:
        expense_id: The exact UUID identifier of the expense, if known.
        search_merchant: Filter keyword of the merchant to find the target expense.
        search_date_str: Filter date of the target expense in YYYY-MM-DD.
        search_category_name: Filter category name of the target expense.
        search_amount: Filter amount of the target expense.
        new_amount: The new amount to assign.
        new_merchant: The new merchant name to assign.
        new_category_name: The new category name to assign.
        new_date_str: The new date to assign in YYYY-MM-DD.
        new_notes: The new notes description.
        new_payment_method: The new payment method to assign.
    """
    return ""

def delete_expense(
    expense_id: str = None,
    merchant: str = None,
    date_str: str = None,
    category_name: str = None,
    amount: float = None
) -> str:
    """
    Delete an existing logged expense.
    
    Args:
        expense_id: The exact UUID identifier of the expense, if known.
        merchant: Filter keyword of the merchant to find the target expense.
        date_str: Filter date of the target expense in YYYY-MM-DD.
        category_name: Filter category name of the target expense.
        amount: Filter amount of the target expense.
    """
    return ""

def create_budget(amount: float, category_name: str, period: str = None) -> str:
    """
    Set or update a budget limit for a category and period.
    
    Args:
        amount: The budget limit amount.
        category_name: The budget category.
        period: The month period in 'YYYY-MM' format. Defaults to current month if None.
    """
    return ""


async def stream_chat_response(messages: list, db: AsyncSession, user_id: uuid.UUID):
    latest_prompt = messages[-1]["content"] if messages else ""
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if openrouter_key:
        try:
            import json
            from openai import AsyncOpenAI
            client = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key
            )
            
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": "list_expenses",
                        "description": "List the user's recent expenses logs.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "limit": {"type": "integer", "description": "The maximum number of recent expenses to list."}
                            }
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "list_budgets",
                        "description": "List active budget limits for the month (format YYYY-MM).",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "period": {"type": "string", "description": "YYYY-MM format"}
                            }
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_analytics_summary",
                        "description": "Get financial analytics summary (income, total spent, savings, rate) for a month (format YYYY-MM).",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "period": {"type": "string", "description": "YYYY-MM format"}
                            }
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "create_expense",
                        "description": "Log a new expense.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "amount": {"type": "number"},
                                "category_name": {"type": "string"},
                                "merchant": {"type": "string"},
                                "date_str": {"type": "string", "description": "YYYY-MM-DD format"},
                                "payment_method": {"type": "string", "description": "Payment method used (e.g. Cash, Card, UPI, Netbanking, Wallet, Other)"}
                            },
                            "required": ["amount", "category_name", "merchant"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "create_budget",
                        "description": "Set or update a budget limit for a category and period.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "amount": {"type": "number"},
                                "category_name": {"type": "string"},
                                "period": {"type": "string", "description": "YYYY-MM format"}
                            },
                            "required": ["amount", "category_name"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "update_expense",
                        "description": "Modify or update details of an existing logged expense.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "expense_id": {"type": "string", "description": "The exact UUID of the expense, if known."},
                                "search_merchant": {"type": "string", "description": "Search filter matching merchant header of target expense."},
                                "search_date_str": {"type": "string", "description": "Search filter matching date of target expense in YYYY-MM-DD format."},
                                "search_category_name": {"type": "string", "description": "Search filter matching category of target expense."},
                                "search_amount": {"type": "number", "description": "Search filter matching amount of target expense."},
                                "new_amount": {"type": "number", "description": "New amount to assign to the expense."},
                                "new_merchant": {"type": "string", "description": "New merchant header to assign."},
                                "new_category_name": {"type": "string", "description": "New category name to assign."},
                                "new_date_str": {"type": "string", "description": "New date to assign in YYYY-MM-DD format."},
                                "new_notes": {"type": "string", "description": "New notes description to assign."},
                                "new_payment_method": {"type": "string", "description": "New payment method to assign (e.g. Cash, Card, UPI, Netbanking, Wallet, Other)."}
                            }
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "delete_expense",
                        "description": "Delete an existing logged expense.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "expense_id": {"type": "string", "description": "The exact UUID of the expense, if known."},
                                "merchant": {"type": "string", "description": "Filter matching merchant name of target expense."},
                                "date_str": {"type": "string", "description": "Filter matching date of target expense in YYYY-MM-DD format."},
                                "category_name": {"type": "string", "description": "Filter matching category of target expense."},
                                "amount": {"type": "number", "description": "Filter matching amount of target expense."}
                            }
                        }
                    }
                }
            ]

            openai_messages = [
                {
                    "role": "system",
                    "content": (
                        "You are FinAI, a helpful personal finance assistant. Respond politely and concisely. "
                        "If the user asks to log multiple expenses at once (e.g. 'I spent 150 on coffee yesterday and 200 on lunch on 2026-07-05'), "
                        "you must generate separate parallel tool calls for each individual expense, extracting their corresponding date_str if specified (otherwise defaulting to current date). "
                        "You can also modify or delete expenses via update_expense and delete_expense tools. "
                        "Use function calling tools when the user requests database information, logging, updates, deletions, or budgets. "
                        "Format responses nicely in markdown."
                    )
                }
            ]
            for m in messages:
                role = "assistant" if m["role"] == "model" else m["role"]
                openai_messages.append({"role": role, "content": m["content"]})
                
            response = await client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=openai_messages,
                tools=tools,
                tool_choice="auto",
                max_tokens=2048
            )
            
            message = response.choices[0].message
            
            while message.tool_calls:
                assistant_msg = {
                    "role": "assistant",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": tc.type,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        } for tc in message.tool_calls
                    ]
                }
                if message.content:
                    assistant_msg["content"] = message.content
                    
                openai_messages.append(assistant_msg)
                
                for tool_call in message.tool_calls:
                    name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)
                    
                    if name == "list_expenses":
                        res_val = await list_expenses_tool(db, user_id, int(args.get("limit", 10)))
                    elif name == "list_budgets":
                        res_val = await list_budgets_tool(db, user_id, args.get("period"))
                    elif name == "get_analytics_summary":
                        res_val = await get_analytics_summary_tool(db, user_id, args.get("period"))
                    elif name == "create_expense":
                        res_val = await create_expense_tool(
                            db, user_id, float(args["amount"]), str(args["category_name"]), str(args["merchant"]), args.get("date_str"), args.get("payment_method")
                        )
                    elif name == "create_budget":
                        res_val = await create_budget_tool(
                            db, user_id, float(args["amount"]), str(args["category_name"]), args.get("period")
                        )
                    elif name == "delete_expense":
                        res_val = await delete_expense_tool(
                            db, user_id,
                            expense_id=args.get("expense_id"),
                            merchant=args.get("merchant"),
                            date_str=args.get("date_str"),
                            category_name=args.get("category_name"),
                            amount=args.get("amount")
                        )
                    elif name == "update_expense":
                        res_val = await update_expense_tool(
                            db, user_id,
                            expense_id=args.get("expense_id"),
                            search_merchant=args.get("search_merchant"),
                            search_date_str=args.get("search_date_str"),
                            search_category_name=args.get("search_category_name"),
                            search_amount=args.get("search_amount"),
                            new_amount=args.get("new_amount"),
                            new_merchant=args.get("new_merchant"),
                            new_category_name=args.get("new_category_name"),
                            new_date_str=args.get("new_date_str"),
                            new_notes=args.get("new_notes"),
                            new_payment_method=args.get("new_payment_method")
                        )
                    else:
                        res_val = f"Error: Tool {name} not found."
                    
                    openai_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": name,
                        "content": json.dumps({"result": res_val})
                    })
                    
                response = await client.chat.completions.create(
                    model="google/gemini-2.5-flash",
                    messages=openai_messages,
                    max_tokens=2048
                )
                message = response.choices[0].message
                
            if message.content:
                yield message.content
            return
        except Exception as err:
            yield f"⚠️ *OpenRouter Error*: {str(err)}\n\nFalling back to local simulator:\n"
            async for chunk in mock_agent_stream(latest_prompt, db, user_id):
                yield chunk
            return

    if not gemini_key:
        async for chunk in mock_agent_stream(latest_prompt, db, user_id):
            yield chunk
        return
        
    try:
        import google.generativeai as genai
        from google.generativeai.types import content_types
        
        genai.configure(api_key=gemini_key)
        
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            tools=[list_expenses, list_budgets, get_analytics_summary, create_expense, update_expense, delete_expense, create_budget],
            system_instruction=(
                "You are FinAI, a helpful personal finance assistant. Respond politely and concisely. "
                "If the user asks to log multiple expenses at once (e.g. 'I spent 150 on coffee yesterday and 200 on lunch on 2026-07-05'), "
                "you must generate separate parallel tool calls for each individual expense, extracting their corresponding date_str if specified (otherwise defaulting to current date). "
                "You can also modify or delete expenses via update_expense and delete_expense tools. "
                "Use function calling tools when the user requests database information, logging, updates, deletions, or budgets. "
                "Format responses nicely in markdown."
            )
        )
        
        chat = model.start_chat(enable_automatic_function_calling=False)
        
        for msg in messages[:-1]:
            chat.history.append(
                content_types.to_content({
                    "role": "user" if msg["role"] == "user" else "model",
                    "parts": [msg["content"]]
                })
            )
            
        response = chat.send_message(latest_prompt)
        
        while response.function_calls:
            for function_call in response.function_calls:
                name = function_call.name
                args = function_call.args
                
                if name == "list_expenses":
                    res_val = await list_expenses_tool(db, user_id, int(args.get("limit", 10)))
                elif name == "list_budgets":
                    res_val = await list_budgets_tool(db, user_id, args.get("period"))
                elif name == "get_analytics_summary":
                    res_val = await get_analytics_summary_tool(db, user_id, args.get("period"))
                elif name == "create_expense":
                    res_val = await create_expense_tool(
                        db, user_id, float(args["amount"]), str(args["category_name"]), str(args["merchant"]), args.get("date_str"), args.get("payment_method")
                    )
                elif name == "create_budget":
                    res_val = await create_budget_tool(
                        db, user_id, float(args["amount"]), str(args["category_name"]), args.get("period")
                    )
                elif name == "delete_expense":
                    res_val = await delete_expense_tool(
                        db, user_id,
                        expense_id=args.get("expense_id"),
                        merchant=args.get("merchant"),
                        date_str=args.get("date_str"),
                        category_name=args.get("category_name"),
                        amount=args.get("amount")
                    )
                elif name == "update_expense":
                    res_val = await update_expense_tool(
                        db, user_id,
                        expense_id=args.get("expense_id"),
                        search_merchant=args.get("search_merchant"),
                        search_date_str=args.get("search_date_str"),
                        search_category_name=args.get("search_category_name"),
                        search_amount=args.get("search_amount"),
                        new_amount=args.get("new_amount"),
                        new_merchant=args.get("new_merchant"),
                        new_category_name=args.get("new_category_name"),
                        new_date_str=args.get("new_date_str"),
                        new_notes=args.get("new_notes"),
                        new_payment_method=args.get("new_payment_method")
                    )
                else:
                    res_val = f"Error: Tool {name} not found."
                
                response = chat.send_message(
                    content_types.to_content({
                        "role": "function",
                        "parts": [
                            content_types.to_part({
                                "function_response": {
                                    "name": name,
                                    "response": {"result": res_val}
                                }
                            })
                        ]
                    })
                )
        
        if response.text:
            yield response.text
            
    except Exception as err:
        yield f"⚠️ *Gemini Error*: {str(err)}\n\nFalling back to local simulator:\n"
        async for chunk in mock_agent_stream(latest_prompt, db, user_id):
            yield chunk

