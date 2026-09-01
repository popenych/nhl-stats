"""drop unused photo_path on players and places

Revision ID: 17adf0ebf4a8
Revises: 5765da7e24d9
Create Date: 2026-09-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17adf0ebf4a8'
down_revision: Union[str, Sequence[str], None] = '5765da7e24d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('players', 'photo_path')
    op.drop_column('places', 'photo_path')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('places', sa.Column('photo_path', sa.String(), nullable=True))
    op.add_column('players', sa.Column('photo_path', sa.String(), nullable=True))
