"""Model factory. One place decides which provider Strands talks to.

The submission runs on Amazon Bedrock. The Anthropic provider exists so development can
continue while Bedrock model access is pending, and `none` lets every deterministic part of the
system (harness, scanner, planted candidates, dashboard) run with no model at all.
"""
from agent.config import AWS_REGION, MODEL_ID, PROVIDER

# The submission's model. Strands' own Bedrock default is a Claude model, so a missing
# FLAKEPROOF_MODEL_ID must never fall through to it.
DEFAULT_BEDROCK_MODEL = "us.amazon.nova-2-lite-v1:0"


class ModelUnavailable(RuntimeError):
    pass


def model_available() -> bool:
    return PROVIDER in ("bedrock", "anthropic")


def describe_model() -> str:
    if PROVIDER == "bedrock":
        return f"bedrock:{MODEL_ID or DEFAULT_BEDROCK_MODEL} @ {AWS_REGION}"
    if PROVIDER == "anthropic":
        return f"anthropic:{MODEL_ID or 'claude-sonnet-4-6'}"
    return "none (deterministic mode)"


def make_model(temperature: float = 0.2, max_tokens: int = 8000):
    """Return a Strands Model for the configured provider."""
    if PROVIDER == "bedrock":
        from strands.models.bedrock import BedrockModel
        return BedrockModel(model_id=MODEL_ID or DEFAULT_BEDROCK_MODEL, region_name=AWS_REGION,
                            temperature=temperature, max_tokens=max_tokens)
    if PROVIDER == "anthropic":
        try:
            from strands.models.anthropic import AnthropicModel
        except ImportError as exc:      # pragma: no cover
            raise ModelUnavailable("pip install anthropic to use FLAKEPROOF_PROVIDER=anthropic") from exc
        return AnthropicModel(model_id=MODEL_ID or "claude-sonnet-4-6", max_tokens=max_tokens,
                              params={"temperature": temperature})
    raise ModelUnavailable(
        "No model configured. Set FLAKEPROOF_PROVIDER=bedrock (with AWS credentials) or "
        "FLAKEPROOF_PROVIDER=anthropic (with ANTHROPIC_API_KEY).")
