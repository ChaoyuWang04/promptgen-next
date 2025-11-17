'use client';

/**
 * Settings Page
 * System configuration and preferences
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Settings, AlertCircle, Save } from 'lucide-react';

export default function SettingsPage() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Implement settings save logic
    console.log('Settings saved');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">
          配置系统参数和个人偏好
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>通用设置</CardTitle>
          <CardDescription>基本系统配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="app-name">应用名称</Label>
            <Input
              id="app-name"
              defaultValue="PromptGen"
              placeholder="输入应用名称"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>暗色模式</Label>
              <p className="text-sm text-muted-foreground">
                切换系统主题颜色
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自动保存</Label>
              <p className="text-sm text-muted-foreground">
                编辑时自动保存更改
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle>API 配置</CardTitle>
          <CardDescription>AI Provider API密钥配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gemini-key">Gemini API Key</Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="输入Gemini API密钥"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bytedance-key">Bytedance API Key</Label>
            <Input
              id="bytedance-key"
              type="password"
              placeholder="输入字节跳动API密钥"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              API密钥存储在环境变量中，请勿在此处输入。此功能将在后续版本中完善。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>性能设置</CardTitle>
          <CardDescription>优化系统性能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="batch-size">批量生成并发数</Label>
            <Input
              id="batch-size"
              type="number"
              defaultValue="3"
              min="1"
              max="10"
            />
            <p className="text-xs text-muted-foreground">
              同时处理的图片数量 (1-10)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cache-ttl">缓存过期时间 (分钟)</Label>
            <Input
              id="cache-ttl"
              type="number"
              defaultValue="60"
              min="5"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用查询缓存</Label>
              <p className="text-sm text-muted-foreground">
                缓存API查询结果以提升性能
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">重置</Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          保存设置
        </Button>
      </div>
      </form>

      {/* Development Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>开发中</AlertTitle>
        <AlertDescription>
          设置功能正在开发中。当前页面仅用于UI展示，实际配置请通过环境变量或配置文件进行。
        </AlertDescription>
      </Alert>
    </div>
  );
}
