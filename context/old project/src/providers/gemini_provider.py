"""
Google Gemini API Provider Implementation

使用gemini-2.5-flash-image模型生成图片
"""

import os
from typing import Dict, Optional
from PIL import Image
from io import BytesIO

from google import genai
from google.genai import types

from .base import ImageGeneratorProvider


class GeminiProvider(ImageGeneratorProvider):
    """Google Gemini API图片生成器"""

    def __init__(self, config: Dict):
        """
        初始化Gemini Provider

        Args:
            config: 配置字典，需包含:
                - api_key: Gemini API密钥
                - model: 模型名称 (默认: gemini-2.5-flash-image)
                - aspect_ratio: 纵横比 (默认: 9:16)
                - timeout: 超时时间(秒) (默认: 120)
        """
        super().__init__(config)

        self.api_key = config.get('api_key')
        self.model = config.get('model', 'gemini-2.5-flash-image')
        self.aspect_ratio = config.get('aspect_ratio', '9:16')
        self.timeout = config.get('timeout', 120)

        # 初始化Gemini客户端
        if self.api_key and self.api_key != 'your_api_key_here':
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize Gemini client: {e}")
                self.client = None
        else:
            self.client = None

    def generate_image(self, prompt: str, base_image: Optional[Image.Image] = None) -> Dict:
        """
        使用Gemini API生成图片

        Args:
            prompt: 文本提示词
            base_image: 可选的参考图片（用于对比图生成）

        Returns:
            Dict包含:
                - success (bool): 是否成功
                - image (PIL.Image): 生成的图片对象（成功时）
                - error (str): 错误信息（失败时）
                - metadata (dict): 额外元数据
        """
        def _generate():
            if not self.client:
                return {
                    'success': False,
                    'error': 'Gemini client not initialized. Check API key configuration.'
                }

            try:
                # 准备API调用内容
                if base_image:
                    # Round 2: 包含参考图片作为上下文
                    contents = [prompt, base_image]
                else:
                    # Round 1: 仅文本提示词
                    contents = [prompt]

                # 调用Gemini API
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        image_config=types.ImageConfig(
                            aspect_ratio=self.aspect_ratio
                        )
                    )
                )

                # 提取并返回图片
                for part in response.candidates[0].content.parts:
                    if part.text is not None:
                        print(f"  Gemini API response text: {part.text}")
                    elif part.inline_data is not None:
                        image = Image.open(BytesIO(part.inline_data.data))
                        return {
                            'success': True,
                            'image': image,
                            'metadata': {
                                'model': self.model,
                                'aspect_ratio': self.aspect_ratio,
                                'has_base_image': base_image is not None
                            }
                        }

                # 未找到图片数据
                return {
                    'success': False,
                    'error': 'No image data in Gemini API response'
                }

            except Exception as e:
                return {
                    'success': False,
                    'error': f"Gemini API error: {type(e).__name__}: {str(e)}"
                }

        # 使用基类的追踪机制
        return self._execute_with_tracking(_generate)

    def is_available(self) -> bool:
        """
        检查Gemini Provider是否可用

        Returns:
            bool: True表示已配置API密钥且客户端初始化成功
        """
        return self.client is not None

    def validate_config(self) -> Dict:
        """
        验证Gemini配置是否完整

        Returns:
            Dict包含:
                - valid (bool): 配置是否有效
                - missing_keys (list): 缺失的配置项
                - error (str): 错误信息（如果有）
        """
        missing_keys = []

        if not self.api_key or self.api_key == 'your_api_key_here':
            missing_keys.append('api_key')

        if missing_keys:
            return {
                'valid': False,
                'missing_keys': missing_keys,
                'error': f"Missing required config keys: {', '.join(missing_keys)}"
            }

        if not self.client:
            return {
                'valid': False,
                'missing_keys': [],
                'error': 'Failed to initialize Gemini client'
            }

        return {
            'valid': True,
            'missing_keys': [],
            'error': None
        }

    def supports_base_image(self) -> bool:
        """
        Gemini支持传递参考图片

        Returns:
            bool: True
        """
        return True

    def get_config_info(self) -> Dict:
        """
        获取当前配置信息

        Returns:
            Dict: 配置详情（不包含敏感信息如API密钥）
        """
        return {
            'provider': self.name,
            'model': self.model,
            'aspect_ratio': self.aspect_ratio,
            'timeout': self.timeout,
            'api_key_configured': bool(self.api_key and self.api_key != 'your_api_key_here'),
            'client_initialized': self.client is not None,
            'supports_base_image': True
        }

    def __str__(self):
        status = "available" if self.is_available() else "unavailable"
        return f"Gemini Provider ({self.model}) - {status}"
