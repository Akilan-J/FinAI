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
    date_str: str = None
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
            payment_method="other",
            date=parsed_date,
            notes="Logged via AI Chat Assistant"
        )
        db.add(expense)
        await db.commit()
        return f"Successfully logged expense: ₹{amount:.2f} at {merchant} under '{category.name}' on {parsed_date}."
    except Exception as e:
        await db.rollback()
        return f"Failed to log expense: {str(e)}"


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
        if any(keyword in prompt_lower for keyword in ["log", "add", "create", "new", "record"]):
            amount_match = re.search(r'(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d{1,2})?)', prompt_lower)
            amount = float(amount_match.group(1)) if amount_match else 150.0
            
            category = "Other"
            for cat in ["food", "rent", "travel", "coffee", "groceries", "utilities", "shopping", "entertainment"]:
                if cat in prompt_lower:
                    category = cat
                    break
            
            merchant = "Store"
            merchant_match = re.search(r'(?:at|from|to)\s+([a-zA-Z0-9\s]+)', prompt)
            if merchant_match:
                merchant = merchant_match.group(1).strip()
            
            result = await create_expense_tool(db, user_id, amount, category, merchant)
            yield f"🤖 *Simulation Mode (No API Key)*:\n\n{result}"
        else:
            result = await list_expenses_tool(db, user_id)
            yield f"🤖 *Simulation Mode (No API Key)*:\n\nHere are your recent expenses:\n{result}"
            
    elif "budget" in prompt_lower:
        if any(keyword in prompt_lower for keyword in ["set", "add", "create", "limit"]):
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

def create_expense(amount: float, category_name: str, merchant: str, date_str: str = None) -> str:
    """
    Log a new expense.
    
    Args:
        amount: The expense amount decimal number.
        category_name: The category category (e.g., Food, Travel, Rent).
        merchant: The place or person paid.
        date_str: Date of expense in YYYY-MM-DD format. Defaults to today if None.
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
                                "date_str": {"type": "string", "description": "YYYY-MM-DD format"}
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
                }
            ]

            openai_messages = [
                {
                    "role": "system",
                    "content": (
                        "You are FinAI, a helpful personal finance assistant. Respond politely and concisely. "
                        "Use function calling tools when the user requests database information, logging, or budgets. "
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
                            db, user_id, float(args["amount"]), str(args["category_name"]), str(args["merchant"]), args.get("date_str")
                        )
                    elif name == "create_budget":
                        res_val = await create_budget_tool(
                            db, user_id, float(args["amount"]), str(args["category_name"]), args.get("period")
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
            tools=[list_expenses, list_budgets, get_analytics_summary, create_expense, create_budget],
            system_instruction=(
                "You are FinAI, a helpful personal finance assistant. Respond politely and concisely. "
                "Use function calling tools when the user requests database information, logging, or budgets. "
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
                        db, user_id, float(args["amount"]), str(args["category_name"]), str(args["merchant"]), args.get("date_str")
                    )
                elif name == "create_budget":
                    res_val = await create_budget_tool(
                        db, user_id, float(args["amount"]), str(args["category_name"]), args.get("period")
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

