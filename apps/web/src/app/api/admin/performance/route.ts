/**
 * 性能监控仪表板 API
 * 提供性能数据查询接口（仅管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiResponse';

/**
 * GET /api/admin/performance
 * 获取性能监控数据
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d
    const metric = searchParams.get('metric'); // LCP, FID, CLS, etc.
    
    const client = getClient();
    if (!client) {
      return NextResponse.json(
        createErrorResponse('DATABASE_ERROR', '数据库连接失败'),
        { status: 500 }
      );
    }

    // 验证用户是否为管理员
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', '未授权'),
        { status: 401 }
      );
    }

    const { data: profile } = await client
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', '权限不足'),
        { status: 403 }
      );
    }

    // 计算时间范围
    const periodDays = period === '90d' ? 90 : period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 1. 获取 Web Vitals 统计数据
    const webVitalsQuery = client
      .from('web_vitals')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (metric) {
      webVitalsQuery.eq('metric_name', metric);
    }

    const { data: webVitals, error: webVitalsError } = await webVitalsQuery;

    if (webVitalsError) {
      throw webVitalsError;
    }

    // 2. 获取性能趋势数据
    const { data: trends } = await client
      .from('performance_trends_daily')
      .select('*')
      .gte('day', startDate.toISOString())
      .order('day', { ascending: false })
      .limit(periodDays);

    // 3. 获取 API 性能统计
    const { data: apiStats } = await client
      .from('api_stats_hourly')
      .select('*')
      .gte('hour', startDate.toISOString())
      .order('hour', { ascending: false })
      .limit(100);

    // 4. 获取慢查询列表
    const { data: slowApis } = await client
      .from('slow_apis')
      .select('*')
      .limit(20);

    // 5. 计算汇总统计
    const stats = calculateStats(webVitals || []);

    // 6. 按页面分组统计
    const pageStats = calculatePageStats(webVitals || []);

    // 7. 按设备类型统计
    const deviceStats = calculateDeviceStats(webVitals || []);

    return NextResponse.json(
      createSuccessResponse({
        period,
        startDate: startDate.toISOString(),
        summary: stats,
        trends: trends || [],
        pageStats,
        deviceStats,
        apiStats: apiStats || [],
        slowApis: slowApis || [],
        sampleCount: webVitals?.length || 0,
      })
    );
  } catch (error: any) {
    console.error('[Performance API Error]:', error);
    return NextResponse.json(
      createErrorResponse('SERVER_ERROR', error.message || '服务器错误'),
      { status: 500 }
    );
  }
}

/**
 * 计算性能统计
 */
function calculateStats(data: any[]) {
  const metrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'];
  const stats: Record<string, any> = {};

  for (const metricName of metrics) {
    const metricData = data.filter(d => d.metric_name === metricName);
    
    if (metricData.length === 0) {
      stats[metricName] = {
        count: 0,
        avg: 0,
        p50: 0,
        p75: 0,
        p95: 0,
        good: 0,
        needsImprovement: 0,
        poor: 0,
      };
      continue;
    }

    const values = metricData.map(d => Number(d.metric_value)).sort((a, b) => a - b);
    
    stats[metricName] = {
      count: metricData.length,
      avg: average(values),
      p50: percentile(values, 0.5),
      p75: percentile(values, 0.75),
      p95: percentile(values, 0.95),
      p99: percentile(values, 0.99),
      min: values[0],
      max: values[values.length - 1],
      good: metricData.filter(d => d.metric_rating === 'good').length,
      needsImprovement: metricData.filter(d => d.metric_rating === 'needs-improvement').length,
      poor: metricData.filter(d => d.metric_rating === 'poor').length,
      goodPercentage: (metricData.filter(d => d.metric_rating === 'good').length / metricData.length * 100).toFixed(2),
    };
  }

  return stats;
}

/**
 * 按页面统计
 */
function calculatePageStats(data: any[]) {
  const pages: Record<string, any> = {};

  for (const item of data) {
    const path = item.page_path || '/';
    
    if (!pages[path]) {
      pages[path] = {
        path,
        count: 0,
        metrics: {},
      };
    }

    pages[path].count++;
    
    if (!pages[path].metrics[item.metric_name]) {
      pages[path].metrics[item.metric_name] = [];
    }
    
    pages[path].metrics[item.metric_name].push(Number(item.metric_value));
  }

  // 计算每个页面的平均值
  const pageStatsArray = Object.values(pages).map((page: any) => {
    const avgMetrics: Record<string, number> = {};
    
    for (const [metric, values] of Object.entries(page.metrics)) {
      avgMetrics[metric] = average(values as number[]);
    }
    
    return {
      path: page.path,
      count: page.count,
      avgMetrics,
    };
  });

  // 按访问次数排序
  return pageStatsArray.sort((a, b) => b.count - a.count).slice(0, 20);
}

/**
 * 按设备类型统计
 */
function calculateDeviceStats(data: any[]) {
  const devices: Record<string, any> = {
    mobile: [],
    tablet: [],
    desktop: [],
    unknown: [],
  };

  for (const item of data) {
    const deviceType = item.device_type || 'unknown';
    if (devices[deviceType]) {
      devices[deviceType].push(item);
    }
  }

  const deviceStatsArray = Object.entries(devices).map(([device, items]) => {
    const metricValues = items.map((item: any) => Number(item.metric_value));
    
    return {
      device,
      count: items.length,
      avgValue: metricValues.length > 0 ? average(metricValues) : 0,
      p75: metricValues.length > 0 ? percentile(metricValues.sort((a, b) => a - b), 0.75) : 0,
    };
  });

  return deviceStatsArray.filter(d => d.count > 0);
}

/**
 * 计算平均值
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 计算百分位数
 */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil(sortedValues.length * p) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

/**
 * POST /api/admin/performance
 * 上报性能数据（客户端调用）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    const client = getClient();
    if (!client) {
      return NextResponse.json(
        createErrorResponse('DATABASE_ERROR', '数据库连接失败'),
        { status: 500 }
      );
    }

    // 插入数据（不需要认证，RLS 策略允许插入）
    if (type === 'web_vitals') {
      const { error } = await client.from('web_vitals').insert(data);
      
      if (error) {
        throw error;
      }
    } else if (type === 'custom_metrics') {
      const { error } = await client.from('custom_metrics').insert(data);
      
      if (error) {
        throw error;
      }
    } else if (type === 'api_performance') {
      const { error } = await client.from('api_performance').insert(data);
      
      if (error) {
        throw error;
      }
    } else {
      return NextResponse.json(
        createErrorResponse('INVALID_TYPE', '无效的数据类型'),
        { status: 400 }
      );
    }

    return NextResponse.json(createSuccessResponse({ success: true }));
  } catch (error: any) {
    console.error('[Performance POST Error]:', error);
    return NextResponse.json(
      createErrorResponse('SERVER_ERROR', error.message || '服务器错误'),
      { status: 500 }
    );
  }
}

