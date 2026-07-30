"""add_currency_to_expenses_and_income

Revision ID: b8623e02ea79
Revises: 6b05f3bec161
Create Date: 2026-07-31 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8623e02ea79'
down_revision: Union[str, Sequence[str], None] = '6b05f3bec161'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('expenses', sa.Column('currency', sa.String(length=3), nullable=True))
    op.add_column('expenses', sa.Column('amount_home_currency', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('income', sa.Column('currency', sa.String(length=3), nullable=True))
    op.add_column('income', sa.Column('amount_home_currency', sa.Numeric(precision=12, scale=2), nullable=True))

    # Backfill existing rows: assume they were logged in the owning user's
    # currency at the time, so amount_home_currency == amount.
    op.execute(
        """
        UPDATE expenses
        SET currency = users.currency, amount_home_currency = expenses.amount
        FROM users
        WHERE users.id = expenses.user_id
        """
    )
    op.execute(
        """
        UPDATE income
        SET currency = users.currency, amount_home_currency = income.amount
        FROM users
        WHERE users.id = income.user_id
        """
    )

    op.alter_column('expenses', 'currency', existing_type=sa.String(length=3), nullable=False, server_default='INR')
    op.alter_column('expenses', 'amount_home_currency', existing_type=sa.Numeric(precision=12, scale=2), nullable=False)
    op.alter_column('income', 'currency', existing_type=sa.String(length=3), nullable=False, server_default='INR')
    op.alter_column('income', 'amount_home_currency', existing_type=sa.Numeric(precision=12, scale=2), nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('income', 'amount_home_currency')
    op.drop_column('income', 'currency')
    op.drop_column('expenses', 'amount_home_currency')
    op.drop_column('expenses', 'currency')
