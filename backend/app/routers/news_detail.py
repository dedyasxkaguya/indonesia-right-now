import asyncio
import logging

from fastapi import APIRouter, Request
from slowapi import Limiter

from app.config import Settings
from app.errors import AppError
from app.responses import ok
from app.schemas.article_detail import ArticleDetailEnvelope
from app.services.ai import AIConfigurationError, AIGuardError
from app.services.article_ai import (
    ArticleAIError,
    ArticleGuardBlocked,
    ArticleTextIncomplete,
    clean_article_text,
)
from app.services.article_fetch import (
    ArticleContentTypeError,
    ArticleFetchError,
    ArticleHTTPError,
    ArticleNetworkError,
    ArticleRedirectError,
    ArticleResponseTooLarge,
    fetch_article,
)

logger = logging.getLogger(__name__)


def build_router(settings: Settings, limiter: Limiter) -> APIRouter:
    router = APIRouter()

    async def get_article_detail(request: Request, url: str):
        if not settings.ai_enabled:
            raise AppError(
                "NEWS_DETAIL_AI_DISABLED",
                "AI processing is disabled.",
                status_code=503,
                details={"url": url[:256]},
            )
        try:
            article = await asyncio.wait_for(
                fetch_article(
                    url,
                    max_url_length=settings.fetch_max_url_length,
                    timeout=min(
                        float(settings.pyscrape_default_timeout),
                        settings.app_request_timeout,
                    ),
                    user_agent=settings.pyscrape_ua,
                ),
                timeout=settings.app_request_timeout,
            )
            content, model = await asyncio.wait_for(
                clean_article_text(
                    article.text,
                    settings,
                    request_id=request.state.request_id,
                ),
                timeout=settings.app_request_timeout,
            )
        except AppError:
            raise
        except TimeoutError as exc:
            raise AppError(
                "NEWS_DETAIL_TIMEOUT",
                "The article request exceeded the configured time limit.",
                status_code=504,
                details={"url": url[:256]},
            ) from exc
        except ArticleContentTypeError as exc:
            raise AppError(
                "NEWS_DETAIL_UNSUPPORTED_CONTENT",
                str(exc),
                status_code=415,
                details={"url": url[:256]},
            ) from exc
        except ArticleResponseTooLarge as exc:
            raise AppError(
                "NEWS_DETAIL_TOO_LARGE",
                str(exc),
                status_code=413,
                details={"url": url[:256]},
            ) from exc
        except ArticleRedirectError as exc:
            raise AppError(
                "NEWS_DETAIL_REDIRECT",
                str(exc),
                status_code=502,
                details={"url": url[:256]},
            ) from exc
        except ArticleHTTPError as exc:
            raise AppError(
                "NEWS_DETAIL_UPSTREAM",
                str(exc),
                status_code=502,
                details={"url": url[:256]},
            ) from exc
        except ArticleNetworkError as exc:
            raise AppError(
                "NEWS_DETAIL_NETWORK",
                str(exc),
                status_code=502,
                details={"url": url[:256]},
            ) from exc
        except ArticleFetchError as exc:
            raise AppError(
                "NEWS_DETAIL_NO_CONTENT",
                str(exc),
                status_code=422,
                details={"url": url[:256]},
            ) from exc
        except ArticleGuardBlocked as exc:
            raise AppError(
                "NEWS_DETAIL_GUARD_BLOCKED",
                "The extracted article was blocked by the prompt-injection guard.",
                status_code=403,
                details={"reason": str(exc)[:200]},
            ) from exc
        except AIGuardError as exc:
            raise AppError(
                "NEWS_DETAIL_GUARD_FAILED",
                "The article could not be processed because its safety check failed.",
                status_code=502,
            ) from exc
        except AIConfigurationError as exc:
            raise AppError(
                "NEWS_DETAIL_AI_CONFIG",
                str(exc),
                status_code=500,
            ) from exc
        except ArticleTextIncomplete as exc:
            raise AppError(
                "NEWS_DETAIL_INCOMPLETE",
                str(exc),
                status_code=502,
            ) from exc
        except ArticleAIError as exc:
            raise AppError(
                "NEWS_DETAIL_AI_FAILED",
                str(exc),
                status_code=502,
            ) from exc
        except Exception as exc:
            logger.exception("article detail processing failed")
            raise AppError(
                "NEWS_DETAIL_FAILED",
                "The article could not be processed.",
                status_code=500,
                details={"exception": type(exc).__name__},
            ) from exc

        request.state.ai = {
            "model": model,
            "extracted_length": len(article.text),
            "cleaned_length": len(content),
            "completeness": "not_verified",
        }
        request.state.exit_code = 0
        return ok(
            request,
            settings,
            {
                "requested_url": article.requested_url,
                "final_url": article.final_url,
                "title": article.title,
                "author": article.author,
                "publisher": article.publisher,
                "published_at": article.published_at,
                "language": article.language,
                "content": content,
                "extracted_length": len(article.text),
                "cleaned_length": len(content),
                "completeness": "not_verified",
                "extraction_method": article.extraction_method,
                "ai_model": model,
                "http_status": article.http_status,
            },
        )

    if settings.app_env == "production":
        get_article_detail = limiter.limit(settings.rate_limit_news)(get_article_detail)
    router.add_api_route(
        "/news/detail/",
        get_article_detail,
        methods=["GET"],
        response_model=ArticleDetailEnvelope,
        summary="Extract and clean an article's available text",
        description=(
            "Fetches a public HTML article, extracts readable text, and cleans it with "
            "the configured Groq model. Completeness is not verified; results may omit "
            "content unavailable in the fetched page."
        ),
    )
    return router
