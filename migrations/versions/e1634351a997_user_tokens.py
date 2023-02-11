"""user tokens

Revision ID: e1634351a997
Revises: fd24fcbb6ba6
Create Date: 2020-08-30 14:41:03.482313

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e1634351a997"
down_revision = "fd24fcbb6ba6"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("user", sa.Column("token", sa.String(length=32), nullable=True))
    op.add_column("user", sa.Column("token_expiration", sa.DateTime(), nullable=True))
    op.create_index(op.f("ix_user_token"), "user", ["token"], unique=True)
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_user_token"), table_name="user")
    op.drop_column("user", "token_expiration")
    op.drop_column("user", "token")
    # ### end Alembic commands ###
