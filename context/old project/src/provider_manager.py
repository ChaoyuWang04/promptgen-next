"""
Provider Manager - 多Provider调度与Fallback管理

负责：
1. 根据配置初始化provider链
2. 实现fallback逻辑（按优先级顺序尝试所有provider）
3. 强制同provider约束（主图和对比图必须用同一provider）
4. 统计信息收集
5. Provider健康检查
"""

import os
from typing import Dict, List, Optional
from PIL import Image
from dotenv import load_dotenv

from src.providers import AVAILABLE_PROVIDERS, ImageGeneratorProvider

load_dotenv()


class ProviderManager:
    """Provider管理器 - 负责多Provider调度与fallback"""

    def __init__(self, provider_order: List[str] = None):
        """
        初始化ProviderManager

        Args:
            provider_order: Provider优先级列表（如 ['gemini', 'openai', 'stability']）
                          如果不提供，从环境变量IMAGE_PROVIDERS读取
        """
        # 读取provider优先级顺序
        if provider_order is None:
            provider_order_str = os.getenv('IMAGE_PROVIDERS', 'gemini,bytedance')
            provider_order = [p.strip() for p in provider_order_str.split(',')]

        self.provider_order = provider_order
        self.providers: Dict[str, ImageGeneratorProvider] = {}

        # 初始化所有配置的providers
        self._initialize_providers()

        print(f"ProviderManager initialized with order: {self.provider_order}")
        print(f"Available providers: {[name for name, p in self.providers.items() if p.is_available()]}")

    def _initialize_providers(self):
        """根据配置初始化所有providers"""
        for provider_name in self.provider_order:
            if provider_name not in AVAILABLE_PROVIDERS:
                print(f"Warning: Unknown provider '{provider_name}'. Skipping.")
                continue

            # 读取provider配置
            config = self._load_provider_config(provider_name)

            # 创建provider实例
            provider_class = AVAILABLE_PROVIDERS[provider_name]
            provider = provider_class(config)

            self.providers[provider_name] = provider

            # 验证配置
            validation = provider.validate_config()
            if validation['valid']:
                print(f"  ✓ {provider_name} provider initialized successfully")
            else:
                print(f"  ✗ {provider_name} provider configuration invalid: {validation['error']}")

    def _load_provider_config(self, provider_name: str) -> Dict:
        """
        从环境变量加载provider配置

        Args:
            provider_name: provider名称

        Returns:
            Dict: 配置字典
        """
        configs = {
            'gemini': {
                'api_key': os.getenv('GEMINI_API_KEY'),
                'model': os.getenv('GEMINI_MODEL', 'gemini-2.5-flash-image'),
                'aspect_ratio': os.getenv('GEMINI_ASPECT_RATIO', '9:16'),
                'timeout': int(os.getenv('GEMINI_TIMEOUT', '120'))
            },
            'bytedance': {
                'api_key': os.getenv('BYTEDANCE_API_KEY'),
                'base_url': os.getenv('BYTEDANCE_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
                'model': os.getenv('BYTEDANCE_MODEL', 'doubao-seedream-4-0-250828'),
                'size': os.getenv('BYTEDANCE_SIZE', '1440x2560'),
                'watermark': os.getenv('BYTEDANCE_WATERMARK', 'False'),
                'timeout': int(os.getenv('BYTEDANCE_TIMEOUT', '60'))
            }
        }

        return configs.get(provider_name, {})

    def generate_with_fallback(self, prompt: str, base_image: Optional[Image.Image] = None,
                              progress_callback: Optional[callable] = None) -> Dict:
        """
        使用fallback策略生成图片

        按照provider_order的顺序依次尝试，直到成功或全部失败

        Args:
            prompt: 文本提示词
            base_image: 可选的参考图片
            progress_callback: 进度回调函数，接收status_detail字典

        Returns:
            Dict包含:
                - success (bool): 是否成功
                - image (PIL.Image): 生成的图片（成功时）
                - provider_used (str): 使用的provider名称（成功时）
                - attempts (list): 所有尝试的记录
                - error (str): 错误信息（失败时）
        """
        attempts = []
        total_attempts = len(self.provider_order)

        for idx, provider_name in enumerate(self.provider_order):
            provider = self.providers.get(provider_name)

            if not provider:
                attempts.append({
                    'provider': provider_name,
                    'success': False,
                    'error': 'Provider not initialized',
                    'skipped': True
                })
                continue

            if not provider.is_available():
                attempts.append({
                    'provider': provider_name,
                    'success': False,
                    'error': 'Provider not available (check configuration)',
                    'skipped': True
                })
                print(f"  Skipping {provider_name} (not available)")
                continue

            # 检查是否支持base_image
            if base_image and not provider.supports_base_image():
                print(f"  Note: {provider_name} doesn't support base_image. Using prompt-only generation.")

            # 报告进度：正在尝试当前provider
            if progress_callback:
                provider_display = {'gemini': 'Gemini', 'bytedance': 'ByteDance'}.get(provider_name, provider_name)
                progress_callback({
                    'provider': provider_name,
                    'attempt': idx + 1,
                    'total_attempts': total_attempts,
                    'message': f'正在使用{provider_display}...'
                })

            # 尝试生成
            print(f"  Trying {provider_name}...")
            result = provider.generate_image(prompt, base_image)

            attempts.append({
                'provider': provider_name,
                'success': result['success'],
                'error': result.get('error'),
                'metadata': result.get('metadata', {}),
                'skipped': False
            })

            if result['success']:
                print(f"  ✓ {provider_name} succeeded!")
                return {
                    'success': True,
                    'image': result['image'],
                    'provider_used': provider_name,
                    'attempts': attempts,
                    'metadata': result.get('metadata', {})
                }
            else:
                print(f"  ✗ {provider_name} failed: {result.get('error')}")

                # 报告进度：失败，尝试下一个provider
                if progress_callback and idx < total_attempts - 1:
                    next_provider = self.provider_order[idx + 1]
                    next_provider_display = {'gemini': 'Gemini', 'bytedance': 'ByteDance'}.get(next_provider, next_provider)
                    provider_display = {'gemini': 'Gemini', 'bytedance': 'ByteDance'}.get(provider_name, provider_name)
                    progress_callback({
                        'provider': provider_name,
                        'attempt': idx + 1,
                        'total_attempts': total_attempts,
                        'message': f'{provider_display}失败，切换{next_provider_display}...'
                    })

        # 所有provider都失败 - 返回结构化错误对象
        return {
            'success': False,
            'error': {
                'code': 'ALL_PROVIDERS_FAILED',
                'message': '所有配置的图片生成服务均失败',
                'provider_errors': [
                    {
                        'provider': attempt['provider'],
                        'error': attempt['error'],
                        'error_type': self._classify_provider_error(attempt['error'])
                    }
                    for attempt in attempts if not attempt['success']
                ]
            },
            'attempts': attempts
        }

    def _classify_provider_error(self, error_message: str) -> str:
        """
        分类Provider错误类型，用于前端显示

        Args:
            error_message: 错误消息字符串

        Returns:
            错误类型: quota_exceeded, auth_failed, timeout, network_error, unavailable, unknown
        """
        if not error_message:
            return 'unknown'

        error_lower = str(error_message).lower()

        if 'quota' in error_lower or 'limit' in error_lower or 'rate limit' in error_lower:
            return 'quota_exceeded'
        elif 'api key' in error_lower or 'authentication' in error_lower or 'auth' in error_lower:
            return 'auth_failed'
        elif 'timeout' in error_lower:
            return 'timeout'
        elif 'network' in error_lower or 'connection' in error_lower:
            return 'network_error'
        elif 'not configured' in error_lower or 'unavailable' in error_lower:
            return 'unavailable'
        else:
            return 'unknown'

    def generate_with_provider(self, provider_name: str, prompt: str,
                               base_image: Optional[Image.Image] = None,
                               progress_callback: Optional[callable] = None) -> Dict:
        """
        使用指定的provider生成图片（用于强制同provider约束）

        Args:
            provider_name: 指定的provider名称
            prompt: 文本提示词
            base_image: 可选的参考图片
            progress_callback: 进度回调函数，接收status_detail字典

        Returns:
            Dict包含:
                - success (bool): 是否成功
                - image (PIL.Image): 生成的图片（成功时）
                - provider_used (str): 使用的provider名称
                - error (str): 错误信息（失败时）
        """
        provider = self.providers.get(provider_name)

        if not provider:
            return {
                'success': False,
                'error': f"Provider '{provider_name}' not found"
            }

        if not provider.is_available():
            return {
                'success': False,
                'error': f"Provider '{provider_name}' not available"
            }

        # 报告进度：正在使用指定的provider
        if progress_callback:
            provider_display = {'gemini': 'Gemini', 'bytedance': 'ByteDance'}.get(provider_name, provider_name)
            progress_callback({
                'provider': provider_name,
                'attempt': 1,
                'total_attempts': 1,
                'message': f'正在使用{provider_display}...'
            })

        print(f"  Using {provider_name} (forced)...")
        result = provider.generate_image(prompt, base_image)

        if result['success']:
            print(f"  ✓ {provider_name} succeeded!")
            return {
                'success': True,
                'image': result['image'],
                'provider_used': provider_name,
                'metadata': result.get('metadata', {})
            }
        else:
            print(f"  ✗ {provider_name} failed: {result.get('error')}")
            return {
                'success': False,
                'error': result.get('error'),
                'provider_used': provider_name
            }

    def get_provider_stats(self) -> Dict:
        """
        获取所有provider的统计信息

        Returns:
            Dict: 各provider的统计数据
        """
        stats = {}
        for name, provider in self.providers.items():
            stats[name] = {
                **provider.get_stats(),
                'available': provider.is_available(),
                'config_info': provider.get_config_info()
            }
        return stats

    def get_available_providers(self) -> List[str]:
        """
        获取当前可用的provider列表

        Returns:
            List[str]: 可用provider名称列表
        """
        return [name for name, provider in self.providers.items() if provider.is_available()]

    def check_provider_health(self) -> Dict:
        """
        检查所有provider的健康状态

        Returns:
            Dict包含:
                - healthy (int): 健康provider数量
                - total (int): 总provider数量
                - details (dict): 各provider健康状态
        """
        details = {}
        healthy_count = 0

        for name, provider in self.providers.items():
            validation = provider.validate_config()
            is_healthy = validation['valid'] and provider.is_available()

            if is_healthy:
                healthy_count += 1

            details[name] = {
                'healthy': is_healthy,
                'available': provider.is_available(),
                'validation': validation,
                'stats': provider.get_stats()
            }

        return {
            'healthy': healthy_count,
            'total': len(self.providers),
            'details': details
        }

    def reset_all_stats(self):
        """重置所有provider的统计信息"""
        for provider in self.providers.values():
            provider.reset_stats()

    def __str__(self):
        available = self.get_available_providers()
        return f"ProviderManager (order: {self.provider_order}, available: {available})"
