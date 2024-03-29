"""half_muffled

Revision ID: 4a809163498d
Revises: 72f53493788e
Create Date: 2020-11-02 13:49:12.831241

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4a809163498d"
down_revision = "72f53493788e"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("towerDB", sa.Column("half_muffled", sa.Boolean(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("towerDB", "half_muffled")
    # ### end Alembic commands ###
