"""
图片生成Provider模块

提供多种图片生成API的统一接口实现
"""

from .base import ImageGeneratorProvider
from .gemini_provider import GeminiProvider
from .bytedance_provider import ByteDanceProvider

# Provider注册表
AVAILABLE_PROVIDERS = {
    'gemini': GeminiProvider,
    'bytedance': ByteDanceProvider
}

__all__ = [
    'ImageGeneratorProvider',
    'GeminiProvider',
    'ByteDanceProvider',
    'AVAILABLE_PROVIDERS'
]
