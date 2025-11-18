"""
ByteDance Doubao API Provider Implementation

使用字节跳动豆包(Doubao) seedream-4-0模型生成图片
"""

import requests
from typing import Dict, Optional
from PIL import Image
from io import BytesIO

try:
    from volcenginesdkarkruntime import Ark
    BYTEDANCE_AVAILABLE = True
except ImportError:
    BYTEDANCE_AVAILABLE = False
    Ark = None

from .base import ImageGeneratorProvider


class ByteDanceProvider(ImageGeneratorProvider):
    """ByteDance Doubao API图片生成器"""

    def __init__(self, config: Dict):
        """
        初始化ByteDance Provider

        Args:
            config: 配置字典，需包含:
                - api_key: ByteDance API密钥
                - base_url: API端点 (默认: https://ark.cn-beijing.volces.com/api/v3)
                - model: 模型名称 (默认: doubao-seedream-4-0-250828)
                - size: 图片尺寸 (默认: 1440x2560, 对应9:16)
                - watermark: 是否添加水印 (默认: False)
                - timeout: 下载图片超时时间(秒) (默认: 60)
        """
        super().__init__(config)

        self.api_key = config.get('api_key')
        self.base_url = config.get('base_url', 'https://ark.cn-beijing.volces.com/api/v3')
        self.model = config.get('model', 'doubao-seedream-4-0-250828')
        self.size = config.get('size', '1440x2560')
        self.watermark = config.get('watermark', 'False').lower() == 'true' if isinstance(config.get('watermark'), str) else config.get('watermark', False)
        self.timeout = config.get('timeout', 60)

        # 用于存储Round 1生成的图片URL，供Round 2使用
        # 这在单线程顺序执行时是安全的（image_generator.py的执行模式）
        self._last_generated_url = None

        # 初始化ByteDance客户端
        if BYTEDANCE_AVAILABLE and self.api_key and self.api_key != 'your_api_key_here':
            try:
                self.client = Ark(
                    base_url=self.base_url,
                    api_key=self.api_key
                )
            except Exception as e:
                print(f"Warning: Failed to initialize ByteDance client: {e}")
                self.client = None
        else:
            self.client = None

    def generate_image(self, prompt: str, base_image: Optional[Image.Image] = None) -> Dict:
        """
        使用ByteDance API生成图片

        Args:
            prompt: 文本提示词
            base_image: 可选的参考图片（用于对比图生成）
                       注意: ByteDance API使用Round 1返回的URL，而不是PIL.Image对象

        Returns:
            Dict包含:
                - success (bool): 是否成功
                - image (PIL.Image): 生成的图片对象（成功时）
                - error (str): 错误信息（失败时）
                - metadata (dict): 额外元数据（包含image_url供Round 2使用）
        """
        def _generate():
            if not BYTEDANCE_AVAILABLE:
                return {
                    'success': False,
                    'error': 'ByteDance SDK not installed. Run: pip install volcenginesdkarkruntime'
                }

            if not self.client:
                return {
                    'success': False,
                    'error': 'ByteDance client not initialized. Check API key configuration.'
                }

            try:
                # 准备API调用参数
                api_params = {
                    'model': self.model,
                    'prompt': prompt,
                    'size': self.size,
                    'response_format': 'url',
                    'watermark': self.watermark
                }

                # Round 2: 包含参考图片URL
                if base_image is not None and self._last_generated_url:
                    # 使用Round 1保存的URL
                    api_params['image'] = [self._last_generated_url]
                    print(f"  ByteDance: Using Round 1 image URL as context")

                # 调用ByteDance API
                response = self.client.images.generate(**api_params)

                # 提取图片URL
                if not response.data or len(response.data) == 0:
                    return {
                        'success': False,
                        'error': 'No image data in ByteDance API response'
                    }

                image_url = response.data[0].url
                print(f"  ByteDance: Image generated, URL: {image_url[:80]}...")

                # 下载图片
                try:
                    img_response = requests.get(image_url, timeout=self.timeout)
                    img_response.raise_for_status()
                    image = Image.open(BytesIO(img_response.content))
                    print(f"  ByteDance: Image downloaded successfully")
                except Exception as download_error:
                    return {
                        'success': False,
                        'error': f"Failed to download image from URL: {str(download_error)}"
                    }

                # Round 1: 保存URL供Round 2使用
                if base_image is None:
                    self._last_generated_url = image_url
                    print(f"  ByteDance: Saved URL for Round 2")
                else:
                    # Round 2完成，清空URL
                    self._last_generated_url = None
                    print(f"  ByteDance: Round 2 completed, cleared URL cache")

                return {
                    'success': True,
                    'image': image,
                    'metadata': {
                        'model': self.model,
                        'size': self.size,
                        'has_base_image': base_image is not None,
                        'image_url': image_url,
                        'watermark': self.watermark
                    }
                }

            except Exception as e:
                # 发生错误时清空URL缓存
                self._last_generated_url = None
                return {
                    'success': False,
                    'error': f"ByteDance API error: {type(e).__name__}: {str(e)}"
                }

        # 使用基类的追踪机制
        return self._execute_with_tracking(_generate)

    def is_available(self) -> bool:
        """
        检查ByteDance Provider是否可用

        Returns:
            bool: True表示SDK已安装、已配置API密钥且客户端初始化成功
        """
        return BYTEDANCE_AVAILABLE and self.client is not None

    def validate_config(self) -> Dict:
        """
        验证ByteDance配置是否完整

        Returns:
            Dict包含:
                - valid (bool): 配置是否有效
                - missing_keys (list): 缺失的配置项
                - error (str): 错误信息（如果有）
        """
        if not BYTEDANCE_AVAILABLE:
            return {
                'valid': False,
                'missing_keys': [],
                'error': 'ByteDance SDK not installed. Run: pip install volcenginesdkarkruntime'
            }

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
                'error': 'Failed to initialize ByteDance client'
            }

        return {
            'valid': True,
            'missing_keys': [],
            'error': None
        }

    def supports_base_image(self) -> bool:
        """
        ByteDance支持传递参考图片（通过URL）

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
            'base_url': self.base_url,
            'size': self.size,
            'watermark': self.watermark,
            'timeout': self.timeout,
            'api_key_configured': bool(self.api_key and self.api_key != 'your_api_key_here'),
            'client_initialized': self.client is not None,
            'supports_base_image': True,
            'sdk_available': BYTEDANCE_AVAILABLE
        }

    def __str__(self):
        status = "available" if self.is_available() else "unavailable"
        return f"ByteDance Provider ({self.model}) - {status}"
