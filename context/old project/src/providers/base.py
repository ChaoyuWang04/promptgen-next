"""
图片生成Provider抽象基类

定义所有图片生成Provider必须实现的标准接口
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Any
from PIL import Image
import time


class ImageGeneratorProvider(ABC):
    """图片生成Provider抽象基类"""

    def __init__(self, config: Dict[str, Any]):
        """
        初始化Provider

        Args:
            config: Provider配置字典，包含API密钥、模型名等
        """
        self.config = config
        self.name = self.__class__.__name__.replace('Provider', '').lower()
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_duration_ms': 0,
            'last_error': None,
            'last_success_time': None,
            'last_failure_time': None
        }

    @abstractmethod
    def generate_image(self, prompt: str, base_image: Optional[Image.Image] = None) -> Dict:
        """
        生成图片的核心方法

        Args:
            prompt: 文本提示词
            base_image: 可选的参考图片（用于对比图生成）

        Returns:
            Dict包含:
                - success (bool): 是否成功
                - image (PIL.Image): 生成的图片对象（成功时）
                - error (str): 错误信息（失败时）
                - metadata (dict): 额外元数据（生成时间、模型名等）
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        检查Provider是否可用

        Returns:
            bool: True表示配置正确且可以使用
        """
        pass

    @abstractmethod
    def validate_config(self) -> Dict:
        """
        验证配置是否完整

        Returns:
            Dict包含:
                - valid (bool): 配置是否有效
                - missing_keys (list): 缺失的配置项
                - error (str): 错误信息（如果有）
        """
        pass

    def supports_base_image(self) -> bool:
        """
        是否支持基于参考图片生成（默认不支持）

        Returns:
            bool: True表示支持传递base_image参数
        """
        return False

    def get_name(self) -> str:
        """获取Provider名称"""
        return self.name

    def get_stats(self) -> Dict:
        """获取统计信息"""
        avg_duration = 0
        if self.stats['successful_requests'] > 0:
            avg_duration = self.stats['total_duration_ms'] / self.stats['successful_requests']

        success_rate = 0
        if self.stats['total_requests'] > 0:
            success_rate = self.stats['successful_requests'] / self.stats['total_requests']

        return {
            **self.stats,
            'average_duration_ms': avg_duration,
            'success_rate': success_rate
        }

    def reset_stats(self):
        """重置统计信息"""
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_duration_ms': 0,
            'last_error': None,
            'last_success_time': None,
            'last_failure_time': None
        }

    def _record_success(self, duration_ms: float):
        """记录成功的请求"""
        self.stats['total_requests'] += 1
        self.stats['successful_requests'] += 1
        self.stats['total_duration_ms'] += duration_ms
        self.stats['last_success_time'] = time.time()

    def _record_failure(self, error_message: str):
        """记录失败的请求"""
        self.stats['total_requests'] += 1
        self.stats['failed_requests'] += 1
        self.stats['last_error'] = error_message
        self.stats['last_failure_time'] = time.time()

    def _execute_with_tracking(self, func, *args, **kwargs) -> Dict:
        """
        执行函数并追踪统计信息

        Args:
            func: 要执行的函数
            *args, **kwargs: 函数参数

        Returns:
            Dict: 函数执行结果
        """
        start_time = time.time()

        try:
            result = func(*args, **kwargs)
            duration_ms = (time.time() - start_time) * 1000

            if result.get('success'):
                self._record_success(duration_ms)
            else:
                self._record_failure(result.get('error', 'Unknown error'))

            # 添加元数据
            if 'metadata' not in result:
                result['metadata'] = {}
            result['metadata']['duration_ms'] = duration_ms
            result['metadata']['provider'] = self.name

            return result

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_message = f"{type(e).__name__}: {str(e)}"
            self._record_failure(error_message)

            return {
                'success': False,
                'error': error_message,
                'metadata': {
                    'duration_ms': duration_ms,
                    'provider': self.name
                }
            }

    def __str__(self):
        return f"{self.name} Provider"

    def __repr__(self):
        return f"<{self.__class__.__name__} available={self.is_available()}>"
