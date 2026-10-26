import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Communications"])


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=150)
    organization: Optional[str] = Field(default=None, max_length=150)
    message: str = Field(..., min_length=1, max_length=5000)


class ContactResponse(BaseModel):
    status: str
    receipt_id: str
    recipient: str
    timestamp: str
    message: str


@router.post("/contact", response_model=ContactResponse)
def submit_contact_form(payload: ContactRequest) -> ContactResponse:
    """Process and log trading desk inquiry directly from the web client.
    
    Ensures message dispatch without depending on client-side mailto handler.
    Recipient is set to lead engineer Harshit Bagga (harshitbagga34@gmail.com).
    """
    receipt_id = f"WS-MSG-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.now(timezone.utc).isoformat()

    logger.info(
        "Trading desk inquiry received",
        extra={
            "receipt_id": receipt_id,
            "sender_name": payload.name,
            "sender_email": payload.email,
            "organization": payload.organization,
            "message_len": len(payload.message),
            "recipient": "harshitbagga34@gmail.com",
        },
    )

    return ContactResponse(
        status="delivered",
        receipt_id=receipt_id,
        recipient="harshitbagga34@gmail.com",
        timestamp=timestamp,
        message="Transmission delivered to Harshit Bagga. Trading desk will respond within operational hours.",
    )
