"""Serviço de envio de email com Resend"""
import os
import asyncio
import logging
from typing import Optional

import resend
from dotenv import load_dotenv

from src.application.ports.services import EmailSenderPort

load_dotenv()
logger = logging.getLogger(__name__)


class ResendEmailSender(EmailSenderPort):
    """Implementação do envio de email com Resend"""
    
    def __init__(self):
        self.api_key = os.environ.get("RESEND_API_KEY")
        self.sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        
        if self.api_key:
            resend.api_key = self.api_key
    
    async def enviar(
        self,
        destinatario: str,
        assunto: str,
        corpo_html: str,
        anexo_base64: Optional[str] = None,
        nome_anexo: Optional[str] = None
    ) -> bool:
        """Envia email via Resend API"""
        
        if not self.api_key:
            logger.warning("RESEND_API_KEY não configurada, email não será enviado")
            return False
        
        params = {
            "from": self.sender_email,
            "to": [destinatario],
            "subject": assunto,
            "html": corpo_html
        }
        
        # Adicionar anexo se fornecido
        if anexo_base64 and nome_anexo:
            params["attachments"] = [{
                "filename": nome_anexo,
                "content": anexo_base64
            }]
        
        try:
            # Run sync SDK in thread to keep FastAPI non-blocking
            email = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Email enviado para {destinatario}, id: {email.get('id')}")
            return True
        except Exception as e:
            logger.error(f"Erro ao enviar email: {str(e)}")
            return False
