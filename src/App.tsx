import { Fragment, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  CalendarOutlined,
  CloseOutlined,
  CloudDownloadOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  LeftOutlined,
  LoadingOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  SwapRightOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Dropdown,
  Input,
  InputNumber,
  Menu,
  Modal,
  Pagination,
  Select,
  Switch,
  Table,
  Tabs,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

type PlanStatus = '未投放' | '启用中';
type EffectiveType = 'IMMEDIATE' | 'NEXT_DAY_ZERO';
type ScheduleType = 'SCHEDULE_FROM_NOW' | 'SCHEDULE_START_END';
type ProjectOptStatus = 'ENABLE' | 'DISABLE';
type ProjectBudgetMode = 'BUDGET_MODE_DAY' | 'BUDGET_MODE_INFINITE';
type WeekScheduleType = 'ALL' | 'CUSTOM';
type PageView = 'promotion' | 'task';
type LevelKey = 'project' | 'unit';
type PromotionLevel = '项目' | '单元';
type TaskStatus = '成功' | '部分成功' | '失败' | '进行中' | '创建中';
type TaskOperationType =
  | '按筛选结果修改出价'
  | '按筛选结果修改预算'
  | '按筛选结果开启/关闭项目'
  | '按筛选结果修改投放时间'
  | '按筛选结果删除项目'
  | '按筛选结果开启/关闭单元'
  | '按筛选结果修改单元预算'
  | '按筛选结果修改单元出价'
  | '按筛选结果删除单元'
  | '批量删除素材'
  | '同步未使用素材';
type TaskDetailStatus = '成功' | '失败';

interface ProjectRow {
  key: string;
  enabled: boolean;
  projectName: string;
  projectId: string;
  accountName: string;
  accountId: string;
  status: PlanStatus;
  cost: string;
  cpm: string;
  cpc: string;
}

interface UnitRow {
  key: string;
  enabled: boolean;
  unitName: string;
  unitId: string;
  accountName: string;
  accountId: string;
  status: PlanStatus;
  cost: string;
  cpm: string;
  cpc: string;
}

interface FilteredBidTaskPayload {
  media: '巨量引擎';
  level: PromotionLevel;
  filterSnapshot: Array<{ label: string; value: string }>;
  affectedCount: number;
  bidChange: {
    amount: number;
  };
  operator: string;
}

interface FilteredBidTaskResult {
  taskId: string;
  status: 'created';
}

interface WeekSchedulePayloadItem {
  day: string;
  hours: number[];
}

interface FilteredProjectDeliveryTimeTaskPayload {
  media: '巨量引擎';
  level: '项目';
  filterSnapshot: Array<{ label: string; value: string }>;
  affectedCount: number;
  effectiveType: EffectiveType;
  changeScheduleTime: boolean;
  scheduleType?: ScheduleType;
  endTime?: number;
  changeWeekSchedule: boolean;
  weekScheduleType?: WeekScheduleType;
  weekSchedule?: WeekSchedulePayloadItem[];
  operator: string;
}

interface FilteredProjectDeliveryTimeTaskResult {
  taskId: string;
  status: 'created';
}

interface FilteredStatusTaskPayload {
  media: '巨量引擎';
  level: PromotionLevel;
  filterSnapshot: Array<{ label: string; value: string }>;
  affectedCount: number;
  optStatus: ProjectOptStatus;
  operator: string;
}

interface FilteredStatusTaskResult {
  taskId: string;
  status: 'created';
}

interface FilteredBudgetTaskPayload {
  media: '巨量引擎';
  level: PromotionLevel;
  filterSnapshot: Array<{ label: string; value: string }>;
  affectedCount: number;
  budgetMode: ProjectBudgetMode;
  budget?: number;
  operator: string;
}

interface FilteredBudgetTaskResult {
  taskId: string;
  status: 'created';
}

interface FilteredDeleteTaskPayload {
  media: '巨量引擎';
  level: PromotionLevel;
  filterSnapshot: Array<{ label: string; value: string }>;
  affectedCount: number;
  operator: string;
}

interface FilteredDeleteTaskResult {
  taskId: string;
  status: 'created';
}

interface TaskDetailRow {
  key: string;
  resultStatus: TaskDetailStatus;
  objectId: string;
  objectName: string;
  accountId: string;
  accountName: string;
  failReason: string;
  executedAt: string;
}

interface AsyncTaskRecord {
  taskId: string;
  taskName: string;
  operationType: TaskOperationType;
  status: TaskStatus;
  createdAt: string;
  finishedAt?: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  operator: string;
  media?: string;
  level?: string;
  filterSnapshot?: Array<{ label: string; value: string }>;
  paramsSummary?: string;
  details: TaskDetailRow[];
}

const taskOperationOptions: TaskOperationType[] = [
  '按筛选结果修改出价',
  '按筛选结果修改预算',
  '按筛选结果开启/关闭项目',
  '按筛选结果修改投放时间',
  '按筛选结果删除项目',
  '按筛选结果开启/关闭单元',
  '按筛选结果修改单元预算',
  '按筛选结果修改单元出价',
  '按筛选结果删除单元',
  '批量删除素材',
  '同步未使用素材',
];

const taskStatusOptions: TaskStatus[] = ['成功', '部分成功', '失败', '进行中', '创建中'];

const channels = [
  ['channel-all', '渠道合计', '#6ea8ff', '✣'],
  ['channel-tencent', '腾讯广告', '#254a9b', '◒'],
  ['channel-tt', '巨量引擎', '#285a80', '✺'],
  ['channel-qianchuan', '巨量千川', '#4d8af0', '▥'],
  ['channel-kuaishou', '磁力引擎', '#4da1ff', '◔'],
  ['channel-jinniu', '磁力金牛-标准', '#3575e6', '♧'],
  ['channel-baidu', '百度信息流', '#4367e8', '✤'],
  ['channel-baidu-ec', '百度电商/智投', '#4367e8', '✤'],
  ['channel-weibo', '超级粉丝通', '#e94f56', '◉'],
  ['channel-bilibili', 'bilibili', '#4fb6d9', '▣'],
  ['channel-iqiyi', '爱奇艺', '#67d44b', '◈'],
  ['channel-huawei', '华为', '#f0aeb3', '✹'],
  ['channel-mi', '小米', '#e58c55', 'mi'],
  ['channel-qutoutiao', '趣头条', '#9ad39d', '▣'],
  ['channel-huichuan', '超级汇川-智投', '#b4b9ff', '◌'],
];

const projectRows: ProjectRow[] = [
  {
    key: '7638668495316893746',
    enabled: true,
    projectName: 'FZ-0512-DR-0507-0426-CI2297720-无骨鸡爪-2424975838',
    projectId: '7638668495316893746',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-lt-260212-21',
    accountId: '1856912279193738',
    status: '未投放',
    cost: '904.72',
    cpm: '54.84',
    cpc: '2.65',
  },
  {
    key: '7639711225089409070',
    enabled: true,
    projectName: '0514-CI2297707-四孔煎锅-13173-cyj-2460457926',
    projectId: '7639711225089409070',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-kll-260122-3',
    accountId: '1855006235137283',
    status: '启用中',
    cost: '563.61',
    cpm: '33.44',
    cpc: '3.15',
  },
  {
    key: '7651510460688351270',
    enabled: true,
    projectName: '0616-CI1793752-万向轮凳子-2517786475',
    projectId: '7651510460688351270',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-lt-260602--198',
    accountId: '1866882712426634',
    status: '启用中',
    cost: '548.43',
    cpm: '31.57',
    cpc: '0.92',
  },
  {
    key: '7649708647261782070',
    enabled: true,
    projectName: '0612-CI1793741-柔性折叠手机支架-2510392947',
    projectId: '7649708647261782070',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-lt-260509-19',
    accountId: '1864679481804804',
    status: '启用中',
    cost: '494.79',
    cpm: '19.26',
    cpc: '2.37',
  },
  {
    key: '7651219612744400922',
    enabled: true,
    projectName: 'DR-0614-DR-0521-0425-CI2231029-推车置物架-2422818109',
    projectId: '7651219612744400922',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-jw-251119-1',
    accountId: '1851898896603146',
    status: '启用中',
    cost: '480.38',
    cpm: '31.2',
    cpc: '2.15',
  },
  {
    key: '7647384292524671003',
    enabled: true,
    projectName: '0604-CI1779101-无骨鸡爪-2498132332',
    projectId: '7647384292524671003',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-老s-kll-5',
    accountId: '1821827155456010',
    status: '启用中',
    cost: '471.03',
    cpm: '31.01',
    cpc: '2.37',
  },
  {
    key: '7648847693826097203',
    enabled: true,
    projectName: '0608-AYD2297687-捣蒜器-2504841484',
    projectId: '7648847693826097203',
    accountName: '大航海-代理-舜飞-CVR有端-老s-kll-9',
    accountId: '1821827174493268',
    status: '启用中',
    cost: '451.24',
    cpm: '27.66',
    cpc: '1.35',
  },
  {
    key: '7651457720312217651',
    enabled: true,
    projectName: '0615-CI1785121-无骨鸡爪-2517468922',
    projectId: '7651457720312217651',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-老s-kll-21',
    accountId: '1808441916585052',
    status: '启用中',
    cost: '448.08',
    cpm: '29.8',
    cpc: '2.21',
  },
  {
    key: '7631133639983988782',
    enabled: true,
    projectName: '0423-CI1779111-盒装蛋糕-2414403229',
    projectId: '7631133639983988782',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-老s-kll-11',
    accountId: '1825813276459994',
    status: '启用中',
    cost: '419.26',
    cpm: '21.75',
    cpc: '1.29',
  },
  {
    key: '7642165440126484486',
    enabled: true,
    projectName: '0521-CI2230982-无骨鸡爪-2471323116',
    projectId: '7642165440126484486',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-jw-251118-3',
    accountId: '1849090396744715',
    status: '启用中',
    cost: '396.75',
    cpm: '23.85',
    cpc: '2.94',
  },
];

const unitRows: UnitRow[] = [
  {
    key: '1782516382936067',
    enabled: true,
    unitName: '0617-CI2297707-四孔煎锅-自动出价-2460457926',
    unitId: '1782516382936067',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-kll-260122-3',
    accountId: '1855006235137283',
    status: '启用中',
    cost: '612.38',
    cpm: '34.12',
    cpc: '2.91',
  },
  {
    key: '1782516382936071',
    enabled: true,
    unitName: '0616-CI1793752-万向轮凳子-直播间成交-2517786475',
    unitId: '1782516382936071',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-lt-260602--198',
    accountId: '1866882712426634',
    status: '启用中',
    cost: '588.72',
    cpm: '30.84',
    cpc: '1.08',
  },
  {
    key: '1782516382936086',
    enabled: true,
    unitName: '0612-CI1793741-柔性折叠手机支架-OCPM-2510392947',
    unitId: '1782516382936086',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-lt-260509-19',
    accountId: '1864679481804804',
    status: '未投放',
    cost: '516.03',
    cpm: '21.65',
    cpc: '2.18',
  },
  {
    key: '1782516382936092',
    enabled: true,
    unitName: 'DR-0614-推车置物架-搜索流量-2422818109',
    unitId: '1782516382936092',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-jw-251119-1',
    accountId: '1851898896603146',
    status: '启用中',
    cost: '492.18',
    cpm: '28.91',
    cpc: '2.06',
  },
  {
    key: '1782516382936108',
    enabled: true,
    unitName: '0604-CI1779101-无骨鸡爪-通投单元-2498132332',
    unitId: '1782516382936108',
    accountName: '大航海-代理-舜飞-CVR-IOS仅排除-老s-kll-5',
    accountId: '1821827155456010',
    status: '启用中',
    cost: '469.55',
    cpm: '30.48',
    cpc: '2.31',
  },
  {
    key: '1782516382936113',
    enabled: true,
    unitName: '0608-AYD2297687-捣蒜器-素材起量-2504841484',
    unitId: '1782516382936113',
    accountName: '大航海-代理-舜飞-CVR有端-老s-kll-9',
    accountId: '1821827174493268',
    status: '启用中',
    cost: '430.19',
    cpm: '25.96',
    cpc: '1.22',
  },
];

const attrColumns = ['账号名称', '账号ID', '状态', '出价', '投放日期', '投放时段'];
const metricColumns = [
  '展示量',
  '组件曝光数',
  '点击量',
  '组件点击次数（B）',
  '推广页访问量',
  '主页商品橱窗访问量',
  '主页内落地页访问量',
  '主页下载链接点击量',
  '主页内电话拨打点击量',
  'POI点击数',
  '组件点击数',
  '店铺调起数',
  '抖音主页访问量',
  '播放数',
  '3秒播放数',
  '10%进度播放数',
  '25%进度播放数',
  '50%进度播放数',
  '75%进度播放数',
  '99%进度播放数',
  '100%进度播放数',
  '播放完成数(T)',
  'TD转化数',
  '千次有效播放数',
  '直播间观看人次',
  '直播间超过一分钟观看人次',
  '点赞数',
  '评论数',
  '分享数',
  '直播间评论次数',
  '总消费(元)',
  '微信复制',
  '卡券页领取',
  '【系统】独立点击',
  '点击率',
  'CPM(元)',
  'CPC(元)',
  'APP下载完成成本',
  '激活成本',
  '点击激活率',
  '下载激活率',
  '注册成本',
  '注册率',
  '转化成本',
];

const defaultSelectedColumns = ['账号名称', '账号ID', '状态', '总消费(元)', 'CPM(元)', 'CPC(元)'];
const totalProjectCount = 166490;
const totalUnitCount = 284316;
const operatorName = 'zhitou@sunteng.com';
const weekDays = [
  { key: 'MONDAY', label: '周一' },
  { key: 'TUESDAY', label: '周二' },
  { key: 'WEDNESDAY', label: '周三' },
  { key: 'THURSDAY', label: '周四' },
  { key: 'FRIDAY', label: '周五' },
  { key: 'SATURDAY', label: '周六' },
  { key: 'SUNDAY', label: '周日' },
];
const weekHours = Array.from({ length: 24 }, (_, index) => index);
const taskDetailPageSize = 5;
const taskFailReasons = [
  '出价方式不支持修改浅层出价',
  '非项目浅层出价场景',
  '本地缺少可改价判断字段',
  '项目状态不支持改价',
  '巨量接口限频',
  '巨量接口返回失败',
  '对象已删除或无权限',
];

function formatNow(offsetMinutes = 0) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getTaskStatus(successCount: number, failedCount: number, totalCount: number): TaskStatus {
  if (totalCount === 0 || failedCount === totalCount) return '失败';
  if (failedCount > 0 && successCount > 0) return '部分成功';
  return '成功';
}

function buildTaskDetails(operationType: TaskOperationType, level: PromotionLevel = '项目'): TaskDetailRow[] {
  const details = Array.from({ length: 28 }, (_, index) => {
    const item = level === '单元' ? unitRows[index % unitRows.length] : projectRows[index % projectRows.length];
    const failed = index % 6 === 1 || index % 9 === 4;
    const resultStatus: TaskDetailStatus = failed ? '失败' : '成功';
    const objectId = level === '单元' ? (item as UnitRow).unitId : (item as ProjectRow).projectId;
    const objectName = level === '单元' ? (item as UnitRow).unitName : (item as ProjectRow).projectName;

    return {
      key: `${operationType}-${objectId}-${index}`,
      resultStatus,
      objectId,
      objectName,
      accountId: item.accountId,
      accountName: item.accountName,
      failReason: failed ? taskFailReasons[index % taskFailReasons.length] : '',
      executedAt: formatNow(index - 36),
    };
  });

  return details;
}

function createTaskRecord({
  taskId,
  operationType,
  affectedCount,
  operator,
  filterSnapshot,
  paramsSummary,
  forceStatus,
  level = '项目',
  createdOffsetMinutes = -2,
  finishedOffsetMinutes = 0,
}: {
  taskId: string;
  operationType: TaskOperationType;
  affectedCount: number;
  operator: string;
  filterSnapshot?: Array<{ label: string; value: string }>;
  paramsSummary?: string;
  forceStatus?: TaskStatus;
  level?: PromotionLevel;
  createdOffsetMinutes?: number;
  finishedOffsetMinutes?: number;
}): AsyncTaskRecord {
  const details = buildTaskDetails(operationType, level);
  const failedCount = Math.max(1, Math.round(affectedCount * 0.014));
  const successCount = Math.max(0, affectedCount - failedCount);
  const status = forceStatus ?? getTaskStatus(successCount, failedCount, affectedCount);

  return {
    taskId,
    taskName: operationType,
    operationType,
    status,
    createdAt: formatNow(createdOffsetMinutes),
    finishedAt: status === '进行中' || status === '创建中' ? undefined : formatNow(finishedOffsetMinutes),
    totalCount: affectedCount,
    successCount,
    failedCount,
    operator,
    media: '巨量引擎',
    level,
    filterSnapshot,
    paramsSummary,
    details,
  };
}

const initialTaskRecords: AsyncTaskRecord[] = [
  createTaskRecord({
    taskId: 'TASK-20260618-0018',
    operationType: '按筛选结果删除单元',
    affectedCount: 28436,
    operator: operatorName,
    paramsSummary: '删除单元',
    level: '单元',
    forceStatus: '部分成功',
    createdOffsetMinutes: -8,
    finishedOffsetMinutes: -4,
  }),
  createTaskRecord({
    taskId: 'TASK-20260618-0017',
    operationType: '按筛选结果修改单元出价',
    affectedCount: 53280,
    operator: operatorName,
    paramsSummary: '统一修改为 72 元',
    level: '单元',
    forceStatus: '进行中',
    createdOffsetMinutes: -16,
  }),
  createTaskRecord({
    taskId: 'TASK-20260618-0016',
    operationType: '按筛选结果开启/关闭单元',
    affectedCount: 19602,
    operator: operatorName,
    paramsSummary: '关闭单元',
    level: '单元',
    forceStatus: '成功',
    createdOffsetMinutes: -36,
    finishedOffsetMinutes: -28,
  }),
  createTaskRecord({
    taskId: 'TASK-20260618-0015',
    operationType: '按筛选结果修改单元预算',
    affectedCount: 42018,
    operator: operatorName,
    paramsSummary: '日预算 500 元',
    level: '单元',
    forceStatus: '部分成功',
    createdOffsetMinutes: -58,
    finishedOffsetMinutes: -43,
  }),
  createTaskRecord({
    taskId: 'TASK-20260618-0014',
    operationType: '按筛选结果删除项目',
    affectedCount: 16024,
    operator: operatorName,
    paramsSummary: '删除项目',
    forceStatus: '部分成功',
    createdOffsetMinutes: -82,
    finishedOffsetMinutes: -70,
  }),
  createTaskRecord({
    taskId: 'TASK-20260618-0013',
    operationType: '按筛选结果修改投放时间',
    affectedCount: 20386,
    operator: operatorName,
    paramsSummary: '立即生效 / 从今天起长期投放 / 不限时段',
    forceStatus: '成功',
    createdOffsetMinutes: -104,
    finishedOffsetMinutes: -95,
  }),
  createTaskRecord({
    taskId: 'TASK-20260618-0012',
    operationType: '按筛选结果开启/关闭项目',
    affectedCount: 36720,
    operator: operatorName,
    paramsSummary: '开启项目',
    forceStatus: '创建中',
    createdOffsetMinutes: -118,
  }),
  createTaskRecord({
    taskId: 'TASK-20260618-0011',
    operationType: '按筛选结果修改预算',
    affectedCount: 18640,
    operator: operatorName,
    paramsSummary: '不限预算',
    forceStatus: '失败',
    createdOffsetMinutes: -142,
    finishedOffsetMinutes: -136,
  }),
  createTaskRecord({
    taskId: 'TASK-20260617-0007',
    operationType: '按筛选结果修改出价',
    affectedCount: 20386,
    operator: operatorName,
    paramsSummary: '统一修改为 68 元',
    forceStatus: '部分成功',
    createdOffsetMinutes: -180,
    finishedOffsetMinutes: -168,
  }),
  createTaskRecord({
    taskId: 'TASK-20260617-0006',
    operationType: '按筛选结果修改预算',
    affectedCount: 12840,
    operator: operatorName,
    paramsSummary: '日预算 300 元',
    forceStatus: '进行中',
    createdOffsetMinutes: -220,
  }),
  createTaskRecord({
    taskId: 'TASK-20260617-0005',
    operationType: '按筛选结果修改单元出价',
    affectedCount: 9820,
    operator: operatorName,
    paramsSummary: '统一修改为 59.8 元',
    level: '单元',
    forceStatus: '成功',
    createdOffsetMinutes: -260,
    finishedOffsetMinutes: -250,
  }),
  createTaskRecord({
    taskId: 'TASK-20260617-0004',
    operationType: '按筛选结果删除单元',
    affectedCount: 720,
    operator: operatorName,
    paramsSummary: '删除单元',
    level: '单元',
    forceStatus: '失败',
    createdOffsetMinutes: -310,
    finishedOffsetMinutes: -304,
  }),
  createTaskRecord({
    taskId: 'TASK-20260616-0019',
    operationType: '批量删除素材',
    affectedCount: 168,
    operator: operatorName,
    paramsSummary: '删除未投放素材',
    forceStatus: '成功',
    createdOffsetMinutes: -1500,
    finishedOffsetMinutes: -1496,
  }),
  createTaskRecord({
    taskId: 'TASK-20260616-0018',
    operationType: '同步未使用素材',
    affectedCount: 428,
    operator: operatorName,
    paramsSummary: '同步近7天未使用素材',
    forceStatus: '成功',
    createdOffsetMinutes: -1680,
    finishedOffsetMinutes: -1668,
  }),
];

function createFilteredProjectBidTask(payload: FilteredBidTaskPayload): Promise<FilteredBidTaskResult> {
  // Only the filter snapshot and bid parameters are submitted here. Project IDs,
  // current bids, and project details are intentionally not loaded for this flow.
  // The backend filters projects that cannot update shallow cpa_bid from local
  // cache data before calling /open_api/v3.0/project/cpa_bid/update/ in batches
  // of up to 10 projects per advertiser. Filtered projects are recorded as
  // failures without calling OceanEngine.
  void payload;
  return Promise.resolve({
    taskId: `JL-BID-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function createFilteredProjectDeliveryTimeTask(
  payload: FilteredProjectDeliveryTimeTaskPayload,
): Promise<FilteredProjectDeliveryTimeTaskResult> {
  // The backend will resolve projects from the filter snapshot, then batch calls
  // /open_api/v3.0/project/schedule_time/update/ and
  // /open_api/v3.0/project/week_schedule/update/ with at most 10 projects each.
  void payload;
  return Promise.resolve({
    taskId: `JL-DELIVERY-TIME-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function createFilteredProjectStatusTask(payload: FilteredStatusTaskPayload): Promise<FilteredStatusTaskResult> {
  // The backend will resolve projects from the filter snapshot, then batch calls
  // /open_api/v3.0/project/status/update/ with at most 10 projects each.
  void payload;
  return Promise.resolve({
    taskId: `JL-STATUS-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function createFilteredProjectBudgetTask(payload: FilteredBudgetTaskPayload): Promise<FilteredBudgetTaskResult> {
  // The backend will resolve projects from the filter snapshot, then batch calls
  // /open_api/v3.0/project/budget/update/ with at most 10 projects each.
  void payload;
  return Promise.resolve({
    taskId: `JL-BUDGET-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function createFilteredProjectDeleteTask(payload: FilteredDeleteTaskPayload): Promise<FilteredDeleteTaskResult> {
  // The backend will resolve projects from the filter snapshot, group by advertiser_id,
  // then batch calls /open_api/v3.0/project/delete/ with 1-10 project_ids each.
  void payload;
  return Promise.resolve({
    taskId: `JL-DELETE-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function createFilteredUnitBidTask(payload: FilteredBidTaskPayload): Promise<FilteredBidTaskResult> {
  // The backend will resolve units from the filter snapshot, group by advertiser_id,
  // then batch calls /open_api/v3.0/promotion/bid/update/ with 1-10 promotions each.
  void payload;
  return Promise.resolve({
    taskId: `JL-UNIT-BID-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function createFilteredUnitStatusTask(payload: FilteredStatusTaskPayload): Promise<FilteredStatusTaskResult> {
  // The backend will resolve units from the filter snapshot, group by advertiser_id,
  // then batch calls /open_api/v3.0/promotion/status/update/ with 1-10 promotions each.
  void payload;
  return Promise.resolve({
    taskId: `JL-UNIT-STATUS-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function createFilteredUnitBudgetTask(payload: FilteredBudgetTaskPayload): Promise<FilteredBudgetTaskResult> {
  // The backend will resolve units from the filter snapshot, group by advertiser_id,
  // then batch calls /open_api/v3.0/promotion/budget/update/ with 1-10 promotions each.
  void payload;
  return Promise.resolve({
    taskId: `JL-UNIT-BUDGET-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function createFilteredUnitDeleteTask(payload: FilteredDeleteTaskPayload): Promise<FilteredDeleteTaskResult> {
  // The backend will resolve units from the filter snapshot, group by advertiser_id,
  // then batch calls /open_api/v3.0/promotion/delete/ with 1-10 promotions each.
  void payload;
  return Promise.resolve({
    taskId: `JL-UNIT-DELETE-${Date.now().toString().slice(-8)}`,
    status: 'created',
  });
}

function splitId(id: string) {
  return (
    <>
      {id.slice(0, 10)}
      <br />
      {id.slice(10)}
    </>
  );
}

function statusTag(status: PlanStatus) {
  if (status === '未投放') {
    return (
      <span className="sf-status sf-status--warning">
        <span /> 未投放
      </span>
    );
  }
  return (
    <span className="sf-status sf-status--success">
      <span /> 启用中
    </span>
  );
}

function SortTitle({ children, active }: { children: string; active?: boolean }) {
  return (
    <span className="sf-sort-title">
      {children}
      <span className={active ? 'sf-sorter sf-sorter--active' : 'sf-sorter'}>
        <i />
        <b />
      </span>
    </span>
  );
}

function SelectShell({ label, width = 180, children }: { label: string; width?: number; children?: React.ReactNode }) {
  return (
    <div className="sf-filter-item">
      <span className="sf-filter-label">{label}</span>
      <div style={{ width }}>{children}</div>
    </div>
  );
}

export default function SmallFighterPlan() {
  const [pageView, setPageView] = useState<PageView>(() => (window.location.hash === '#task' ? 'task' : 'promotion'));
  const [levelKey, setLevelKey] = useState<LevelKey>('project');
  const [rows, setRows] = useState(projectRows);
  const [unitTableRows, setUnitTableRows] = useState(unitRows);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [selectedUnitKeys, setSelectedUnitKeys] = useState<React.Key[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [unitKeyword, setUnitKeyword] = useState('');
  const [unitStatusFilter, setUnitStatusFilter] = useState<string>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(defaultSelectedColumns);
  const [tablePage, setTablePage] = useState(1);
  const [filteredBidOpen, setFilteredBidOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState<number | null>(68);
  const [creatingBidTask, setCreatingBidTask] = useState(false);
  const [latestBidTask, setLatestBidTask] = useState<FilteredBidTaskResult | null>(null);
  const [deliveryTimeOpen, setDeliveryTimeOpen] = useState(false);
  const [effectiveType, setEffectiveType] = useState<EffectiveType>('IMMEDIATE');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('SCHEDULE_FROM_NOW');
  const [scheduleEndTime, setScheduleEndTime] = useState<Dayjs | null>(null);
  const [weekScheduleType, setWeekScheduleType] = useState<WeekScheduleType>('ALL');
  const [selectedWeekSlots, setSelectedWeekSlots] = useState<string[]>([]);
  const [creatingDeliveryTimeTask, setCreatingDeliveryTimeTask] = useState(false);
  const [latestDeliveryTimeTask, setLatestDeliveryTimeTask] = useState<FilteredProjectDeliveryTimeTaskResult | null>(
    null,
  );
  const [statusTaskOpen, setStatusTaskOpen] = useState(false);
  const [statusTaskAction, setStatusTaskAction] = useState<ProjectOptStatus>('ENABLE');
  const [creatingStatusTask, setCreatingStatusTask] = useState(false);
  const [latestStatusTask, setLatestStatusTask] = useState<FilteredStatusTaskResult | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetMode, setBudgetMode] = useState<ProjectBudgetMode>('BUDGET_MODE_DAY');
  const [budgetAmount, setBudgetAmount] = useState<number | null>(300);
  const [creatingBudgetTask, setCreatingBudgetTask] = useState(false);
  const [latestBudgetTask, setLatestBudgetTask] = useState<FilteredBudgetTaskResult | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [creatingDeleteTask, setCreatingDeleteTask] = useState(false);
  const [latestDeleteTask, setLatestDeleteTask] = useState<FilteredDeleteTaskResult | null>(null);
  const [taskRecords, setTaskRecords] = useState<AsyncTaskRecord[]>(initialTaskRecords);
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [taskOperationFilter, setTaskOperationFilter] = useState<TaskOperationType | 'all'>('all');
  const [taskKeyword, setTaskKeyword] = useState('');
  const [selectedTask, setSelectedTask] = useState<AsyncTaskRecord | null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskDetailFailedOnly, setTaskDetailFailedOnly] = useState(false);
  const [taskDetailKeyword, setTaskDetailKeyword] = useState('');
  const [taskDetailPage, setTaskDetailPage] = useState(1);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesKeyword = keyword
        ? row.projectName.includes(keyword) || row.projectId.includes(keyword)
        : true;
      const matchesStatus = statusFilter ? row.status === statusFilter : true;
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, rows, statusFilter]);

  const visibleUnitRows = useMemo(() => {
    return unitTableRows.filter((row) => {
      const matchesKeyword = unitKeyword ? row.unitName.includes(unitKeyword) || row.unitId.includes(unitKeyword) : true;
      const matchesStatus = unitStatusFilter ? row.status === unitStatusFilter : true;
      return matchesKeyword && matchesStatus;
    });
  }, [unitKeyword, unitStatusFilter, unitTableRows]);

  const filteredResultCount = keyword || statusFilter ? visibleRows.length : totalProjectCount;
  const filteredUnitResultCount = unitKeyword || unitStatusFilter ? visibleUnitRows.length : totalUnitCount;
  const currentLevelLabel: PromotionLevel = levelKey === 'unit' ? '单元' : '项目';
  const currentResultCount = levelKey === 'unit' ? filteredUnitResultCount : filteredResultCount;
  const selectedWeekSlotSet = useMemo(() => new Set(selectedWeekSlots), [selectedWeekSlots]);

  const filterSnapshot = useMemo(() => {
    if (levelKey === 'unit') {
      return [
        { label: '媒体', value: '巨量引擎' },
        { label: '层级', value: '单元' },
        { label: '广告账号', value: '全部账号' },
        { label: '单元状态', value: unitStatusFilter || '全部状态' },
        { label: '营销目的', value: '全部营销目的' },
        { label: '学习期状态', value: '全部学习期状态' },
        { label: '创建时间', value: '不限' },
        { label: '关键词', value: unitKeyword || '未输入' },
        { label: '数据筛选', value: '按当前页面筛选条件' },
      ];
    }

    return [
      { label: '媒体', value: '巨量引擎' },
      { label: '层级', value: '项目' },
      { label: '广告账号', value: '全部账号' },
      { label: '项目状态', value: statusFilter || '全部状态' },
      { label: '营销目的', value: '全部营销目的' },
      { label: '投放模式', value: '全部投放模式' },
      { label: '创建时间', value: '不限' },
      { label: '投放日期', value: '不限' },
      { label: '投放时段', value: '不限' },
      { label: '项目出价', value: '不限' },
      { label: '关键词', value: keyword || '未输入' },
      { label: '数据筛选', value: '按当前页面筛选条件' },
    ];
  }, [keyword, levelKey, statusFilter, unitKeyword, unitStatusFilter]);

  const filteredTasks = useMemo(() => {
    return taskRecords.filter((task) => {
      const matchesStatus = taskStatusFilter === 'all' ? true : task.status === taskStatusFilter;
      const matchesOperation = taskOperationFilter === 'all' ? true : task.operationType === taskOperationFilter;
      const matchesKeyword = taskKeyword
        ? task.taskName.includes(taskKeyword) || task.taskId.includes(taskKeyword) || task.operationType.includes(taskKeyword)
        : true;
      return matchesStatus && matchesOperation && matchesKeyword;
    });
  }, [taskKeyword, taskOperationFilter, taskRecords, taskStatusFilter]);

  const selectedTaskDetails = useMemo(() => {
    if (!selectedTask) return [];
    return selectedTask.details.filter((detail) => {
      const matchesFailed = taskDetailFailedOnly ? detail.resultStatus === '失败' : true;
      const matchesKeyword = taskDetailKeyword
        ? detail.objectId.includes(taskDetailKeyword) ||
          detail.objectName.includes(taskDetailKeyword) ||
          detail.accountId.includes(taskDetailKeyword) ||
          detail.accountName.includes(taskDetailKeyword)
        : true;
      return matchesFailed && matchesKeyword;
    });
  }, [selectedTask, taskDetailFailedOnly, taskDetailKeyword]);

  const appendAsyncTask = (
    taskId: string,
    operationType: TaskOperationType,
    paramsSummary: string,
    affectedCount = currentResultCount,
    level = currentLevelLabel,
  ) => {
    const record = createTaskRecord({
      taskId,
      operationType,
      affectedCount,
      operator: operatorName,
      filterSnapshot,
      paramsSummary,
      level,
    });
    setTaskRecords((prev) => [record, ...prev]);
  };

  const openTaskPage = () => {
    window.location.hash = 'task';
    setPageView('task');
  };

  const openPromotionPage = () => {
    window.location.hash = '';
    setPageView('promotion');
  };

  const openTaskDetail = (task: AsyncTaskRecord) => {
    setSelectedTask(task);
    setTaskDetailFailedOnly(false);
    setTaskDetailKeyword('');
    setTaskDetailPage(1);
    setTaskDrawerOpen(true);
  };

  const focusFailedDetails = () => {
    setTaskDetailFailedOnly(true);
    setTaskDetailPage(1);
    window.setTimeout(() => {
      document.querySelector('.sf-task-result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleOpenFilteredBid = () => {
    if (currentResultCount === 0) {
      message.warning('当前筛选结果为空，请先调整筛选条件');
      return;
    }
    setLatestBidTask(null);
    setFilteredBidOpen(true);
  };

  const handleCreateFilteredBidTask = async () => {
    if (!bidAmount || bidAmount <= 0) {
      message.warning('请输入有效出价金额');
      return;
    }

    setCreatingBidTask(true);
    try {
      const payload = {
        media: '巨量引擎',
        level: currentLevelLabel,
        filterSnapshot,
        affectedCount: currentResultCount,
        bidChange: {
          amount: bidAmount,
        },
        operator: operatorName,
      } as FilteredBidTaskPayload;
      const task = levelKey === 'unit' ? await createFilteredUnitBidTask(payload) : await createFilteredProjectBidTask(payload);
      setLatestBidTask(task);
      appendAsyncTask(
        task.taskId,
        levelKey === 'unit' ? '按筛选结果修改单元出价' : '按筛选结果修改出价',
        `统一修改为 ${bidAmount} 元`,
      );
      message.success(levelKey === 'unit' ? '异步修改单元出价任务已创建' : '异步改价任务已创建');
    } finally {
      setCreatingBidTask(false);
    }
  };

  const handleOpenDeliveryTime = () => {
    if (currentResultCount === 0) {
      message.warning('当前筛选结果为空，请先调整筛选条件');
      return;
    }
    setLatestDeliveryTimeTask(null);
    setDeliveryTimeOpen(true);
  };

  const getSlotKey = (day: string, hour: number) => `${day}-${hour}`;

  const toggleWeekSlot = (day: string, hour: number) => {
    const key = getSlotKey(day, hour);
    setSelectedWeekSlots((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const toggleWeekDay = (day: string) => {
    const daySlots = weekHours.map((hour) => getSlotKey(day, hour));
    const isFullDaySelected = daySlots.every((slot) => selectedWeekSlotSet.has(slot));
    setSelectedWeekSlots((prev) => {
      const rest = prev.filter((slot) => !daySlots.includes(slot));
      return isFullDaySelected ? rest : [...rest, ...daySlots];
    });
  };

  const toggleWeekHour = (hour: number) => {
    const hourSlots = weekDays.map((day) => getSlotKey(day.key, hour));
    const isHourSelected = hourSlots.every((slot) => selectedWeekSlotSet.has(slot));
    setSelectedWeekSlots((prev) => {
      const rest = prev.filter((slot) => !hourSlots.includes(slot));
      return isHourSelected ? rest : [...rest, ...hourSlots];
    });
  };

  const buildWeekSchedulePayload = (): WeekSchedulePayloadItem[] => {
    return weekDays.map((day) => ({
      day: day.key,
      hours: weekHours.filter((hour) => selectedWeekSlotSet.has(getSlotKey(day.key, hour))),
    }));
  };

  const handleCreateDeliveryTimeTask = async () => {
    if (scheduleType === 'SCHEDULE_START_END' && !scheduleEndTime) {
      message.warning('请选择结束日期时间');
      return;
    }
    if (weekScheduleType === 'CUSTOM' && selectedWeekSlots.length === 0) {
      message.warning('请选择投放时段');
      return;
    }

    const endTime = scheduleType === 'SCHEDULE_START_END' && scheduleEndTime ? scheduleEndTime.unix() : undefined;

    setCreatingDeliveryTimeTask(true);
    try {
      const task = await createFilteredProjectDeliveryTimeTask({
        media: '巨量引擎',
        level: '项目',
        filterSnapshot,
        affectedCount: filteredResultCount,
        effectiveType,
        changeScheduleTime: true,
        scheduleType,
        endTime,
        changeWeekSchedule: true,
        weekScheduleType,
        weekSchedule: weekScheduleType === 'CUSTOM' ? buildWeekSchedulePayload() : undefined,
        operator: operatorName,
      });
      setLatestDeliveryTimeTask(task);
      appendAsyncTask(
        task.taskId,
        '按筛选结果修改投放时间',
        `${effectiveType === 'IMMEDIATE' ? '立即生效' : '次日0点生效'} / ${
          scheduleType === 'SCHEDULE_FROM_NOW' ? '从今天起长期投放' : '设置结束日期'
        } / ${weekScheduleType === 'ALL' ? '不限时段' : `指定 ${selectedWeekSlots.length} 个小时段`}`,
      );
      message.success('异步修改投放时间任务已创建');
    } finally {
      setCreatingDeliveryTimeTask(false);
    }
  };

  const handleOpenStatusTask = (optStatus: ProjectOptStatus) => {
    if (currentResultCount === 0) {
      message.warning('当前筛选结果为空，请先调整筛选条件');
      return;
    }
    setStatusTaskAction(optStatus);
    setLatestStatusTask(null);
    setStatusTaskOpen(true);
  };

  const handleCreateStatusTask = async () => {
    setCreatingStatusTask(true);
    try {
      const payload = {
        media: '巨量引擎',
        level: currentLevelLabel,
        filterSnapshot,
        affectedCount: currentResultCount,
        optStatus: statusTaskAction,
        operator: operatorName,
      } as FilteredStatusTaskPayload;
      const task =
        levelKey === 'unit' ? await createFilteredUnitStatusTask(payload) : await createFilteredProjectStatusTask(payload);
      setLatestStatusTask(task);
      appendAsyncTask(
        task.taskId,
        levelKey === 'unit' ? '按筛选结果开启/关闭单元' : '按筛选结果开启/关闭项目',
        `${statusTaskAction === 'ENABLE' ? '开启' : '关闭'}${currentLevelLabel}`,
      );
      message.success(`异步${statusTaskAction === 'ENABLE' ? '开启' : '关闭'}${currentLevelLabel}任务已创建`);
    } finally {
      setCreatingStatusTask(false);
    }
  };

  const handleOpenBudget = () => {
    if (currentResultCount === 0) {
      message.warning('当前筛选结果为空，请先调整筛选条件');
      return;
    }
    setLatestBudgetTask(null);
    setBudgetOpen(true);
  };

  const handleCreateBudgetTask = async () => {
    if (budgetMode === 'BUDGET_MODE_DAY' && (!budgetAmount || budgetAmount <= 0)) {
      message.warning('请输入有效预算金额');
      return;
    }

    setCreatingBudgetTask(true);
    try {
      const payload = {
        media: '巨量引擎',
        level: currentLevelLabel,
        filterSnapshot,
        affectedCount: currentResultCount,
        budgetMode,
        budget: budgetMode === 'BUDGET_MODE_DAY' ? budgetAmount ?? undefined : undefined,
        operator: operatorName,
      } as FilteredBudgetTaskPayload;
      const task =
        levelKey === 'unit' ? await createFilteredUnitBudgetTask(payload) : await createFilteredProjectBudgetTask(payload);
      setLatestBudgetTask(task);
      appendAsyncTask(
        task.taskId,
        levelKey === 'unit' ? '按筛选结果修改单元预算' : '按筛选结果修改预算',
        budgetMode === 'BUDGET_MODE_DAY' ? `日预算 ${budgetAmount} 元` : '不限预算',
      );
      message.success(levelKey === 'unit' ? '异步修改单元预算任务已创建' : '异步修改预算任务已创建');
    } finally {
      setCreatingBudgetTask(false);
    }
  };

  const handleOpenDelete = () => {
    if (currentResultCount === 0) {
      message.warning('当前筛选结果为空，请先调整筛选条件');
      return;
    }
    setLatestDeleteTask(null);
    setDeleteConfirming(false);
    setDeleteConfirmed(false);
    setDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    setDeleteOpen(false);
    setDeleteConfirming(false);
    setDeleteConfirmed(false);
  };

  const handleDeleteFooterClick = async () => {
    if (!deleteConfirming) {
      setDeleteConfirming(true);
      return;
    }
    if (!deleteConfirmed) {
      message.warning('请先确认已核对筛选条件');
      return;
    }

    setCreatingDeleteTask(true);
    try {
      const payload = {
        media: '巨量引擎',
        level: currentLevelLabel,
        filterSnapshot,
        affectedCount: currentResultCount,
        operator: operatorName,
      } as FilteredDeleteTaskPayload;
      const task =
        levelKey === 'unit' ? await createFilteredUnitDeleteTask(payload) : await createFilteredProjectDeleteTask(payload);
      setLatestDeleteTask(task);
      appendAsyncTask(
        task.taskId,
        levelKey === 'unit' ? '按筛选结果删除单元' : '按筛选结果删除项目',
        `删除${currentLevelLabel}`,
      );
      message.success(`异步删除${currentLevelLabel}任务已创建`);
      setDeleteConfirming(false);
      setDeleteConfirmed(false);
    } finally {
      setCreatingDeleteTask(false);
    }
  };

  const confirmSwitch = (row: ProjectRow, checked: boolean) => {
    Modal.confirm({
      title: checked ? '开启项目' : '关闭项目',
      icon: <ExclamationCircleOutlined />,
      content: `确定要${checked ? '开启' : '关闭'}项目「${row.projectName}」吗？`,
      okText: '确 定',
      cancelText: '取 消',
      onOk: () => {
        setRows((prev) => prev.map((item) => (item.key === row.key ? { ...item, enabled: checked } : item)));
        message.success(checked ? '项目已开启' : '项目已关闭');
      },
    });
  };

  const confirmUnitSwitch = (row: UnitRow, checked: boolean) => {
    Modal.confirm({
      title: checked ? '开启单元' : '关闭单元',
      icon: <ExclamationCircleOutlined />,
      content: `确定要${checked ? '开启' : '关闭'}单元「${row.unitName}」吗？`,
      okText: '确 定',
      cancelText: '取 消',
      onOk: () => {
        setUnitTableRows((prev) => prev.map((item) => (item.key === row.key ? { ...item, enabled: checked } : item)));
        message.success(checked ? '单元已开启' : '单元已关闭');
      },
    });
  };

  const columns: ColumnsType<ProjectRow> = [
    {
      title: '开关',
      dataIndex: 'enabled',
      width: 70,
      fixed: 'left',
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.enabled}
          onChange={(checked) => confirmSwitch(row, checked)}
          className="sf-green-switch"
        />
      ),
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      width: 210,
      fixed: 'left',
      render: (value) => <a className="sf-project-link">{value}</a>,
    },
    {
      title: '项目ID',
      dataIndex: 'projectId',
      width: 120,
      render: splitId,
    },
    {
      title: '账号名称',
      dataIndex: 'accountName',
      width: 200,
    },
    {
      title: '账号ID',
      dataIndex: 'accountId',
      width: 120,
      render: splitId,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: statusTag,
    },
    {
      title: <SortTitle active>总消费(元)</SortTitle>,
      dataIndex: 'cost',
      width: 120,
      sorter: (a, b) => Number(a.cost) - Number(b.cost),
    },
    {
      title: <SortTitle>CPM(元)</SortTitle>,
      dataIndex: 'cpm',
      width: 110,
      sorter: (a, b) => Number(a.cpm) - Number(b.cpm),
    },
    {
      title: <SortTitle>CPC(元)</SortTitle>,
      dataIndex: 'cpc',
      width: 110,
      sorter: (a, b) => Number(a.cpc) - Number(b.cpc),
    },
  ];

  const unitColumns: ColumnsType<UnitRow> = [
    {
      title: '开关',
      dataIndex: 'enabled',
      width: 70,
      fixed: 'left',
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.enabled}
          onChange={(checked) => confirmUnitSwitch(row, checked)}
          className="sf-green-switch"
        />
      ),
    },
    {
      title: '单元名称',
      dataIndex: 'unitName',
      width: 210,
      fixed: 'left',
      render: (value) => <a className="sf-project-link">{value}</a>,
    },
    {
      title: '单元ID',
      dataIndex: 'unitId',
      width: 120,
      render: splitId,
    },
    {
      title: '账号名称',
      dataIndex: 'accountName',
      width: 200,
    },
    {
      title: '账号ID',
      dataIndex: 'accountId',
      width: 120,
      render: splitId,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: statusTag,
    },
    {
      title: <SortTitle active>总消费(元)</SortTitle>,
      dataIndex: 'cost',
      width: 120,
      sorter: (a, b) => Number(a.cost) - Number(b.cost),
    },
    {
      title: <SortTitle>CPM(元)</SortTitle>,
      dataIndex: 'cpm',
      width: 110,
      sorter: (a, b) => Number(a.cpm) - Number(b.cpm),
    },
    {
      title: <SortTitle>CPC(元)</SortTitle>,
      dataIndex: 'cpc',
      width: 110,
      sorter: (a, b) => Number(a.cpc) - Number(b.cpc),
    },
  ];

  const batchMenu = (
    <Menu
      className="sf-batch-menu"
      items={
        levelKey === 'unit'
          ? [
              { key: 'open', label: '开启' },
              { key: 'close', label: '关闭' },
              { key: 'budget', label: '修改预算' },
              { key: 'bid', label: '修改出价' },
              { key: 'deepBid', label: '修改深度出价' },
              { key: 'copy', label: '复制单元' },
              { key: 'delete', label: '删除' },
            ]
          : [
              { key: 'open', label: '开启' },
              { key: 'close', label: '关闭' },
              { key: 'budget', label: '修改预算' },
              { key: 'bid', label: '修改出价' },
              { key: 'deepBid', label: '修改深度出价' },
              { key: 'roi', label: '修改ROI系数' },
              { key: 'track', label: '修改监控链接' },
              { key: 'time', label: '修改投放时段' },
              { key: 'boost', label: '新建一键起量' },
              { key: 'delete', label: '删除' },
            ]
      }
      onClick={({ key }) => {
        message.info(`${key === 'open' ? '开启' : key === 'close' ? '关闭' : '已选择操作'}：需先勾选${currentLevelLabel}`);
      }}
    />
  );

  const filteredBatchMenu = (
    <Menu
      className="sf-batch-menu"
      items={
        levelKey === 'unit'
          ? [
              { key: 'status', label: '开启/关闭单元' },
              { key: 'budget', label: '修改预算' },
              { key: 'bid', label: '修改出价' },
              { key: 'delete', label: '删除单元' },
            ]
          : [
              { key: 'status', label: '开启/关闭项目' },
              { key: 'budget', label: '修改预算' },
              { key: 'bid', label: '修改出价' },
              { key: 'deliveryTime', label: '修改投放时间' },
              { key: 'delete', label: '删除项目' },
            ]
      }
      onClick={({ key }) => {
        if (key === 'status') {
          handleOpenStatusTask('ENABLE');
        }
        if (key === 'budget') {
          handleOpenBudget();
        }
        if (key === 'bid') {
          handleOpenFilteredBid();
        }
        if (key === 'deliveryTime') {
          handleOpenDeliveryTime();
        }
        if (key === 'delete') {
          handleOpenDelete();
        }
      }}
    />
  );

  const taskColumns: ColumnsType<AsyncTaskRecord> = [
    {
      title: 'ID',
      dataIndex: 'taskId',
      width: 170,
    },
    {
      title: '任务名称',
      dataIndex: 'taskName',
      width: 210,
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      width: 170,
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      width: 190,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: TaskStatus) => <span className={`sf-task-status sf-task-status--${value}`}>{value}</span>,
    },
    {
      title: '完成时间',
      dataIndex: 'finishedAt',
      width: 170,
      render: (value?: string) => value || '-',
    },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <div className="sf-task-actions">
          <button onClick={() => openTaskDetail(record)}>查看详情</button>
          <button onClick={() => message.success('任务已删除')}>删除</button>
        </div>
      ),
    },
  ];

  const taskDetailColumns: ColumnsType<TaskDetailRow> = [
    {
      title: '执行结果',
      dataIndex: 'resultStatus',
      width: 92,
      render: (value: TaskDetailStatus) => <span className={`sf-task-result sf-task-result--${value}`}>{value}</span>,
    },
    {
      title: '广告ID/项目ID',
      dataIndex: 'objectId',
      width: 150,
    },
    {
      title: '广告名称/项目名称',
      dataIndex: 'objectName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '账号ID',
      dataIndex: 'accountId',
      width: 145,
    },
    {
      title: '账号名称',
      dataIndex: 'accountName',
      width: 190,
      ellipsis: true,
    },
    {
      title: '失败信息',
      dataIndex: 'failReason',
      width: 180,
      render: (value: string) => value || '-',
    },
    {
      title: '执行时间',
      dataIndex: 'executedAt',
      width: 160,
    },
  ];

  const pagedTaskDetails = selectedTaskDetails.slice(
    (taskDetailPage - 1) * taskDetailPageSize,
    taskDetailPage * taskDetailPageSize,
  );

  const statusMenu = (
    <Menu
      className="sf-status-menu"
      selectable
      selectedKeys={(levelKey === 'unit' ? unitStatusFilter : statusFilter) ? [levelKey === 'unit' ? unitStatusFilter! : statusFilter!] : []}
      items={[
        { key: 'all', label: '不限（包含已删除）' },
        { key: '启用中', label: '启用中' },
        {
          key: '未投放',
          label: (
            <span className="sf-submenu-label">
              未投放 <RightOutlined />
            </span>
          ),
          children: [
            { key: '未投放', label: '未投放' },
            { key: '项目审核中新建', label: '项目审核中新建' },
            { key: '广告组暂停', label: '广告组暂停' },
          ],
        },
        { key: 'done', label: '已完成' },
        { key: 'deleted', label: '已删除' },
      ]}
      onClick={({ key }) => {
        const nextStatus = key === 'all' ? undefined : String(key);
        if (levelKey === 'unit') {
          setUnitStatusFilter(nextStatus);
        } else {
          setStatusFilter(nextStatus);
        }
      }}
    />
  );

  return (
    <div className="sf-portal-page">
      <header className="sf-topbar">
        <div className="sf-logo">
          <span className="sf-logo-mark">▼</span>
          <span className="sf-logo-text">买量小飞机</span>
        </div>
        <div className="sf-project-switch">
          项目名称：<b>17.淘宝</b> <DownOutlined />
        </div>
        <nav className="sf-main-tabs">
          <button className={pageView === 'promotion' ? 'active' : ''} onClick={openPromotionPage}>推广</button>
          <button>新建</button>
          <button>智剪</button>
        </nav>
        <div className="sf-top-actions">
          <Button type="text" className="sf-back-link">返回上一级</Button>
          <span className="sf-top-divider" />
          <Button type="text" icon={<QrcodeOutlined />} />
          <Button type="text" icon={<AppstoreOutlined />} />
          <Button type="text" icon={<CloudDownloadOutlined />} onClick={openTaskPage} />
          <span className="sf-avatar">Z</span>
          <span className="sf-user">zhitou@sunteng...</span>
          <DownOutlined className="sf-user-arrow" />
        </div>
      </header>

      <div className="sf-body">
        <aside className="sf-channel-sidebar">
          {channels.map(([key, name, color, icon]) => (
            <button key={key} className={key === 'channel-tt' ? 'active' : ''}>
              <span className="sf-channel-icon" style={{ color }}>{icon}</span>
              <span>{name}</span>
            </button>
          ))}
          <button className="sf-sidebar-collapse">
            <LeftOutlined />
          </button>
        </aside>

        <main className="sf-content">
          {pageView === 'promotion' ? (
          <section className="sf-panel">
            <div className="sf-panel-head">
              <Tabs
                activeKey={levelKey}
                onChange={(key) => {
                  if (key === 'project' || key === 'unit') {
                    setLevelKey(key);
                    setTablePage(1);
                  }
                }}
                className="sf-level-tabs"
                items={[
                  { key: 'account', label: '媒体账户', disabled: true },
                  { key: 'project', label: '项目' },
                  { key: 'unit', label: '单元' },
                ]}
              />
              <RangePicker
                suffixIcon={<CalendarOutlined />}
                separator={<SwapRightOutlined />}
                className="sf-date-picker"
                placeholder={['2026-06-17', '2026-06-17']}
              />
            </div>

            <div className="sf-filter-area">
              <div className="sf-filter-grid">
                <SelectShell label="广告账号" width={205}>
                  <Select mode="tags" placeholder="逗号或空格隔开多个账号" suffixIcon={<DownOutlined />} />
                </SelectShell>
                <SelectShell label={levelKey === 'unit' ? '单元状态' : '项目状态'}>
                  <Dropdown trigger={['click']} overlay={statusMenu} placement="bottomLeft">
                    <button
                      className={(levelKey === 'unit' ? unitStatusFilter : statusFilter) ? 'sf-select-proxy has-value' : 'sf-select-proxy'}
                    >
                      {(levelKey === 'unit' ? unitStatusFilter : statusFilter) || '请选择'} <DownOutlined />
                    </button>
                  </Dropdown>
                </SelectShell>
                <SelectShell label="营销目的">
                  <Select placeholder="请选择" suffixIcon={<DownOutlined />} />
                </SelectShell>
                {levelKey === 'project' ? (
                  <>
                    <SelectShell label="营销类型">
                      <Select
                        placeholder=""
                        suffixIcon={<DownOutlined />}
                        options={[
                          { label: '通投', value: 'ALL' },
                          { label: '搜索', value: 'SEARCH' },
                        ]}
                      />
                    </SelectShell>
                    <SelectShell label="投放模式">
                      <Select placeholder="请选择" suffixIcon={<DownOutlined />} />
                    </SelectShell>
                  </>
                ) : (
                  <SelectShell label="学习期状态">
                    <Select placeholder="请选择" suffixIcon={<DownOutlined />} />
                  </SelectShell>
                )}
                <SelectShell label="创建时间" width={260}>
                  <RangePicker suffixIcon={<CalendarOutlined />} separator={<SwapRightOutlined />} placeholder={['开始日期', '结束日期']} />
                </SelectShell>
                {levelKey === 'project' && (
                  <>
                    <SelectShell label="投放时段" width={260}>
                      <Select placeholder="请选择" suffixIcon={<DownOutlined />} />
                    </SelectShell>
                    <SelectShell label="投放日期" width={340}>
                      <Select placeholder="请选择" suffixIcon={<DownOutlined />} />
                    </SelectShell>
                    <SelectShell label="项目出价" width={240}>
                      <Select placeholder="请选择" suffixIcon={<DownOutlined />} />
                    </SelectShell>
                  </>
                )}
                <Button className="sf-data-filter" onClick={() => setFilterOpen(true)}>数据筛选</Button>
              </div>

              <div className="sf-search-row">
                <Input
                  className="sf-search-input"
                  placeholder={levelKey === 'unit' ? '请输入单元名称/ID' : '请输入项目名称/ID'}
                  value={levelKey === 'unit' ? unitKeyword : keyword}
                  onChange={(event) => (levelKey === 'unit' ? setUnitKeyword(event.target.value) : setKeyword(event.target.value))}
                  onPressEnter={() => setTablePage(1)}
                  suffix={<Button type="text" icon={<SearchOutlined />} onClick={() => setTablePage(1)} />}
                />
              </div>
            </div>

            <div className="sf-action-row">
              <div className="sf-left-actions">
                <Dropdown trigger={['click']} overlay={batchMenu} placement="bottomLeft">
                  <Button className="sf-outline-btn">批量操作</Button>
                </Dropdown>
                <Dropdown trigger={['click']} overlay={filteredBatchMenu} placement="bottomLeft">
                  <Button className="sf-filtered-bid-btn">
                    按筛选结果批量操作 <DownOutlined />
                  </Button>
                </Dropdown>
                <div className="sf-refresh-note">
                  若数据长时间未更新，可点击 <button onClick={() => message.success('已触发手动更新')}>手动更新</button>
                </div>
              </div>
              <div className="sf-right-actions">
                <Button type="text" icon={<ReloadOutlined />} onClick={() => message.success('刷新成功')}>刷新</Button>
                <Button type="text" icon={<CloudDownloadOutlined />} onClick={() => message.info('报表导出任务已创建')}>报表导出</Button>
                <Button type="text" icon={<FilterOutlined />} onClick={() => setColumnsOpen(true)}>自定义列</Button>
              </div>
            </div>

            {levelKey === 'unit' ? (
              <Table<UnitRow>
                className="sf-project-table"
                columns={unitColumns}
                dataSource={visibleUnitRows}
                pagination={false}
                rowSelection={{
                  selectedRowKeys: selectedUnitKeys,
                  onChange: setSelectedUnitKeys,
                  columnWidth: 48,
                }}
                scroll={{ x: 1190, y: 420 }}
                size="middle"
              />
            ) : (
              <Table<ProjectRow>
              className="sf-project-table"
              columns={columns}
              dataSource={visibleRows}
              pagination={false}
              rowSelection={{
                selectedRowKeys: selectedKeys,
                onChange: setSelectedKeys,
                columnWidth: 48,
              }}
              scroll={{ x: 1190, y: 420 }}
              size="middle"
            />
            )}

            <div className="sf-pagination-row">
              <span>共 {(levelKey === 'unit' ? totalUnitCount : totalProjectCount).toLocaleString()} 条记录</span>
              <Pagination
                current={tablePage}
                total={levelKey === 'unit' ? totalUnitCount : totalProjectCount}
                pageSize={10}
                showSizeChanger
                showQuickJumper
                onChange={(page) => setTablePage(page)}
                itemRender={(_, type, original) => {
                  if (type === 'prev') return <LeftOutlined />;
                  if (type === 'next') return <RightOutlined />;
                  return original;
                }}
              />
            </div>
          </section>
          ) : (
            <section className="sf-panel sf-task-page">
              <div className="sf-task-head">
                <div>
                  <h2>任务管理</h2>
                  <span>任务仅保留三天，请及时处理</span>
                </div>
                <Button icon={<ReloadOutlined />} onClick={() => message.success('刷新成功')}>刷新</Button>
              </div>

              <div className="sf-task-filter-row">
                <SelectShell label="状态" width={170}>
                  <Select
                    value={taskStatusFilter}
                    suffixIcon={<DownOutlined />}
                    onChange={setTaskStatusFilter}
                    options={[
                      { label: '全部', value: 'all' },
                      ...taskStatusOptions.map((item) => ({ label: item, value: item })),
                    ]}
                  />
                </SelectShell>
                <SelectShell label="操作类型" width={250}>
                  <Select
                    value={taskOperationFilter}
                    suffixIcon={<DownOutlined />}
                    onChange={setTaskOperationFilter}
                    options={[
                      { label: '全部', value: 'all' },
                      ...taskOperationOptions.map((item) => ({ label: item, value: item })),
                    ]}
                  />
                </SelectShell>
                <Input
                  className="sf-task-search"
                  placeholder="请输入任务名称/ID"
                  value={taskKeyword}
                  onChange={(event) => setTaskKeyword(event.target.value)}
                  suffix={<SearchOutlined />}
                />
              </div>

              <Table<AsyncTaskRecord>
                className="sf-task-table"
                columns={taskColumns}
                dataSource={filteredTasks}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                  showTotal: (total) => `共 ${total} 条记录`,
                }}
                rowKey="taskId"
                scroll={{ x: 1160 }}
              />
            </section>
          )}
        </main>
      </div>

      <Modal
        title={`按筛选结果修改${levelKey === 'unit' ? '单元出价' : '出价'}`}
        open={filteredBidOpen}
        onCancel={() => setFilteredBidOpen(false)}
        width={760}
        centered
        className="sf-filtered-bid-modal"
        footer={[
          <Button key="cancel" onClick={() => setFilteredBidOpen(false)}>取 消</Button>,
          <Button
            key="ok"
            type="primary"
            loading={creatingBidTask}
            disabled={currentResultCount === 0}
            onClick={handleCreateFilteredBidTask}
          >
            提交异步任务
          </Button>,
        ]}
      >
        <div className="sf-filtered-bid-scope">
          <ExclamationCircleOutlined />
          <div>
            <b>将对当前筛选结果中的全部{currentLevelLabel}提交异步改价任务</b>
            <span>
              {levelKey === 'project'
                ? '提交前不会逐条查询项目详情或当前出价；任务执行时会先基于小飞机本地数据过滤不支持改价的项目。'
                : '提交前不会逐条校验单元详情，不会批量查询当前出价；不支持改价的单元会记录为失败，并在任务结果中展示原因。'}
            </span>
          </div>
        </div>

        <div className="sf-filtered-bid-count">
          <span>预计影响</span>
          <strong>{currentResultCount.toLocaleString()}</strong>
          <span>个{currentLevelLabel}</span>
        </div>

        <section className="sf-filtered-bid-form">
          <div className="sf-filtered-bid-field">
            <label>修改方式</label>
            <div className="sf-readonly-value">统一修改为</div>
          </div>
          <div className="sf-filtered-bid-field">
            <label>出价金额</label>
            <InputNumber
              min={0.01}
              precision={2}
              controls={false}
              addonAfter="元"
              value={bidAmount}
              onChange={(value) => setBidAmount(typeof value === 'number' ? value : null)}
              placeholder="请输入"
            />
          </div>
          <div className="sf-filtered-bid-preview">
            改价参数：统一修改为 {bidAmount ? `${bidAmount} 元` : '--'}
          </div>
          {levelKey === 'project' && (
            <div className="sf-budget-rule-tip sf-bid-rule-tip">
              本入口仅修改项目浅层出价 cpa_bid，不修改深层出价、ROI 系数或出价方式。任务执行时会基于小飞机本地数据过滤不支持改价的项目，过滤失败原因会进入任务结果；提交前不会逐条查询项目详情或当前出价。
            </div>
          )}
        </section>

        <section className="sf-filtered-bid-summary">
          <div className="sf-filtered-bid-section-title">当前筛选条件快照</div>
          <div className="sf-filtered-bid-snapshot">
            {filterSnapshot.map((item) => (
              <div className="sf-filtered-bid-snapshot-item" key={item.label}>
                <span>{item.label}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>

        {latestBidTask && (
          <div className="sf-filtered-bid-task">
            {levelKey === 'project'
              ? '任务已创建，后台将先按本地数据过滤可改价项目，再按账号分批执行。'
              : '任务已创建，后台将按筛选条件分批执行。'}
          </div>
        )}
      </Modal>

      <Modal
        title={`按筛选结果开启/关闭${currentLevelLabel}`}
        open={statusTaskOpen}
        onCancel={() => setStatusTaskOpen(false)}
        width={760}
        centered
        className="sf-filtered-bid-modal"
        footer={[
          <Button key="cancel" onClick={() => setStatusTaskOpen(false)}>取 消</Button>,
          <Button
            key="ok"
            type="primary"
            loading={creatingStatusTask}
            disabled={currentResultCount === 0}
            onClick={handleCreateStatusTask}
          >
            提交异步任务
          </Button>,
        ]}
      >
        <div className="sf-filtered-bid-scope">
          <ExclamationCircleOutlined />
          <div>
            <b>将对当前筛选结果中的全部{currentLevelLabel}提交异步开启/关闭任务</b>
            <span>提交前不会逐条查询{currentLevelLabel}详情或当前状态；任务会按账号分组并以每批最多10个{currentLevelLabel}调用巨量接口，不支持操作的{currentLevelLabel}会记录失败原因。</span>
          </div>
        </div>

        <div className="sf-filtered-bid-count">
          <span>预计影响</span>
          <strong>{currentResultCount.toLocaleString()}</strong>
          <span>个{currentLevelLabel}</span>
        </div>

        <section className="sf-filtered-bid-form">
          <div className="sf-filtered-bid-field">
            <label>目标操作</label>
            <div className="sf-segment-group">
              <button
                className={statusTaskAction === 'ENABLE' ? 'active' : ''}
                onClick={() => setStatusTaskAction('ENABLE')}
              >
                开启{currentLevelLabel}
              </button>
              <button
                className={statusTaskAction === 'DISABLE' ? 'active' : ''}
                onClick={() => setStatusTaskAction('DISABLE')}
              >
                关闭{currentLevelLabel}
              </button>
            </div>
          </div>
          <div className="sf-filtered-bid-preview">
            任务将按账号分组、每批最多10个{currentLevelLabel}异步执行。
          </div>
        </section>

        <section className="sf-filtered-bid-summary">
          <div className="sf-filtered-bid-section-title">当前筛选条件快照</div>
          <div className="sf-filtered-bid-snapshot">
            {filterSnapshot.map((item) => (
              <div className="sf-filtered-bid-snapshot-item" key={item.label}>
                <span>{item.label}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>

        {latestStatusTask && (
          <div className="sf-filtered-bid-task">
            任务已创建，后台将按账号分组并每10个{currentLevelLabel}一批执行。
          </div>
        )}
      </Modal>

      <Modal
        title={`按筛选结果修改${levelKey === 'unit' ? '单元预算' : '预算'}`}
        open={budgetOpen}
        onCancel={() => setBudgetOpen(false)}
        width={760}
        centered
        className="sf-filtered-bid-modal"
        footer={[
          <Button key="cancel" onClick={() => setBudgetOpen(false)}>取 消</Button>,
          <Button
            key="ok"
            type="primary"
            loading={creatingBudgetTask}
            disabled={currentResultCount === 0}
            onClick={handleCreateBudgetTask}
          >
            提交异步任务
          </Button>,
        ]}
      >
        <div className="sf-filtered-bid-scope">
          <ExclamationCircleOutlined />
          <div>
            <b>将对当前筛选结果中的全部{currentLevelLabel}提交异步修改预算任务</b>
            <span>提交前不会逐条查询{currentLevelLabel}详情、当前预算或当前状态；任务会按账号分组并以每批最多10个{currentLevelLabel}调用巨量预算接口。</span>
          </div>
        </div>

        <div className="sf-filtered-bid-count">
          <span>预计影响</span>
          <strong>{currentResultCount.toLocaleString()}</strong>
          <span>个{currentLevelLabel}</span>
        </div>

        <section className="sf-filtered-bid-form">
          <div className="sf-filtered-bid-field">
            <label>预算类型</label>
            <div className="sf-segment-group">
              <button
                className={budgetMode === 'BUDGET_MODE_DAY' ? 'active' : ''}
                onClick={() => setBudgetMode('BUDGET_MODE_DAY')}
              >
                日预算
              </button>
              <button
                className={budgetMode === 'BUDGET_MODE_INFINITE' ? 'active' : ''}
                onClick={() => setBudgetMode('BUDGET_MODE_INFINITE')}
              >
                不限预算
              </button>
            </div>
          </div>
          {budgetMode === 'BUDGET_MODE_DAY' && (
            <div className="sf-filtered-bid-field">
              <label>预算金额</label>
              <InputNumber
                min={0.01}
                precision={2}
                controls={false}
                addonAfter="元"
                value={budgetAmount}
                onChange={(value) => setBudgetAmount(typeof value === 'number' ? value : null)}
                placeholder="请输入"
              />
            </div>
          )}
          <div className="sf-filtered-bid-preview">
            修改参数：
            {budgetMode === 'BUDGET_MODE_DAY' ? `日预算 ${budgetAmount ? `${budgetAmount} 元` : '--'}` : '不限预算'}
          </div>
          <div className="sf-budget-rule-tip">
            日预算需满足巨量接口限制，例如不得低于相关项目、营销出价或已有消耗；不符合规则的项目会在任务结果中记录失败原因。
          </div>
        </section>

        <section className="sf-filtered-bid-summary">
          <div className="sf-filtered-bid-section-title">当前筛选条件快照</div>
          <div className="sf-filtered-bid-snapshot">
            {filterSnapshot.map((item) => (
              <div className="sf-filtered-bid-snapshot-item" key={item.label}>
                <span>{item.label}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>

        {latestBudgetTask && (
          <div className="sf-filtered-bid-task">
            任务已创建，后台将按账号分组并每10个{currentLevelLabel}一批执行。
          </div>
        )}
      </Modal>

      <Modal
        title="按筛选结果修改投放时间"
        open={deliveryTimeOpen}
        onCancel={() => setDeliveryTimeOpen(false)}
        width={960}
        centered
        className="sf-filtered-bid-modal"
        footer={[
          <Button key="cancel" onClick={() => setDeliveryTimeOpen(false)}>取 消</Button>,
          <Button
            key="ok"
            type="primary"
            loading={creatingDeliveryTimeTask}
            disabled={filteredResultCount === 0}
            onClick={handleCreateDeliveryTimeTask}
          >
            提交异步任务
          </Button>,
        ]}
      >
        <div className="sf-filtered-bid-scope">
          <ExclamationCircleOutlined />
          <div>
            <b>将对当前筛选结果中的全部项目提交异步修改投放时间任务</b>
            <span>提交前不会逐条查询项目详情、当前投放时间或当前投放时段；任务会按账号分组并以每批最多10个项目调用巨量接口，不支持修改的项目会记录失败原因。</span>
          </div>
        </div>

        <div className="sf-filtered-bid-count">
          <span>预计影响</span>
          <strong>{filteredResultCount.toLocaleString()}</strong>
          <span>个项目</span>
        </div>

        <section className="sf-filtered-bid-form sf-delivery-time-form">
          <div className="sf-delivery-time-section">
            <div className="sf-filtered-bid-section-title">投放时间</div>
            <div className="sf-filtered-bid-field">
              <label>生效方式</label>
              <div className="sf-segment-group">
                <button
                  className={effectiveType === 'IMMEDIATE' ? 'active' : ''}
                  onClick={() => setEffectiveType('IMMEDIATE')}
                >
                  立即生效
                </button>
                <button
                  className={effectiveType === 'NEXT_DAY_ZERO' ? 'active' : ''}
                  onClick={() => setEffectiveType('NEXT_DAY_ZERO')}
                >
                  次日0点生效
                </button>
              </div>
            </div>
            <div className="sf-filtered-bid-field">
              <label>投放日期</label>
              <div className="sf-segment-group">
                <button
                  className={scheduleType === 'SCHEDULE_FROM_NOW' ? 'active' : ''}
                  onClick={() => {
                    setScheduleType('SCHEDULE_FROM_NOW');
                    setScheduleEndTime(null);
                  }}
                >
                  从今天起长期投放
                </button>
                <button
                  className={scheduleType === 'SCHEDULE_START_END' ? 'active' : ''}
                  onClick={() => setScheduleType('SCHEDULE_START_END')}
                >
                  设置结束日期
                </button>
              </div>
            </div>
            {scheduleType === 'SCHEDULE_START_END' && (
              <div className="sf-filtered-bid-field">
                <label>结束日期时间</label>
                <DatePicker
                  showTime={{ format: 'HH:mm:ss' }}
                  format="YYYY-MM-DD HH:mm:ss"
                  className="sf-schedule-time-picker"
                  placeholder="请选择结束日期时间"
                  value={scheduleEndTime}
                  onChange={(value) => setScheduleEndTime(value)}
                />
              </div>
            )}
            <div className="sf-filtered-bid-field">
              <label>投放时段</label>
              <div className="sf-segment-group">
                <button
                  className={weekScheduleType === 'ALL' ? 'active' : ''}
                  onClick={() => {
                    setWeekScheduleType('ALL');
                    setSelectedWeekSlots([]);
                  }}
                >
                  不限
                </button>
                <button
                  className={weekScheduleType === 'CUSTOM' ? 'active' : ''}
                  onClick={() => setWeekScheduleType('CUSTOM')}
                >
                  指定投放时间段
                </button>
              </div>
            </div>
            {weekScheduleType === 'CUSTOM' && (
              <div className="sf-week-schedule-wrap">
                <div className="sf-week-schedule-tools">
                  <span>已选 {selectedWeekSlots.length} 个小时段</span>
                  <Button size="small" onClick={() => setSelectedWeekSlots([])}>
                    清空
                  </Button>
                </div>
                <div className="sf-week-schedule-grid">
                  <div className="sf-week-schedule-corner">星期</div>
                  {weekHours.map((hour) => (
                    <button
                      type="button"
                      className="sf-week-schedule-hour"
                      key={hour}
                      onClick={() => toggleWeekHour(hour)}
                    >
                      {String(hour).padStart(2, '0')}
                    </button>
                  ))}
                  {weekDays.map((day) => (
                    <Fragment key={day.key}>
                      <button
                        type="button"
                        className="sf-week-schedule-day"
                        onClick={() => toggleWeekDay(day.key)}
                      >
                        {day.label}
                      </button>
                      {weekHours.map((hour) => {
                        const slotKey = getSlotKey(day.key, hour);
                        return (
                          <button
                            type="button"
                            aria-label={`${day.label} ${String(hour).padStart(2, '0')}点`}
                            className={selectedWeekSlotSet.has(slotKey) ? 'sf-week-schedule-cell active' : 'sf-week-schedule-cell'}
                            key={slotKey}
                            onClick={() => toggleWeekSlot(day.key, hour)}
                          />
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="sf-filtered-bid-preview">
            修改参数：
            {effectiveType === 'IMMEDIATE' ? '立即生效' : '次日0点生效'} / 
            {scheduleType === 'SCHEDULE_FROM_NOW' ? '从今天起长期投放' : '设置结束日期'} / 
            {weekScheduleType === 'ALL' ? '不限时段' : `指定 ${selectedWeekSlots.length} 个小时段`}
          </div>
          <div className="sf-budget-rule-tip sf-delivery-time-tip">
            后端按筛选快照异步分批执行，提交前不逐条查询项目当前配置。
          </div>
        </section>

        <section className="sf-filtered-bid-summary">
          <div className="sf-filtered-bid-section-title">当前筛选条件快照</div>
          <div className="sf-filtered-bid-snapshot">
            {filterSnapshot.map((item) => (
              <div className="sf-filtered-bid-snapshot-item" key={item.label}>
                <span>{item.label}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>

        {latestDeliveryTimeTask && (
          <div className="sf-filtered-bid-task">
            任务已创建，后台将按账号分组并每10个项目一批执行。
          </div>
        )}
      </Modal>

      <Modal
        title={`按筛选结果删除${currentLevelLabel}`}
        open={deleteOpen}
        onCancel={handleCloseDelete}
        width={760}
        centered
        className="sf-filtered-bid-modal"
        footer={[
          <Button key="cancel" onClick={handleCloseDelete}>取消</Button>,
          <Button
            key="ok"
            danger
            type="primary"
            loading={creatingDeleteTask}
            disabled={currentResultCount === 0 || (deleteConfirming && !deleteConfirmed)}
            onClick={handleDeleteFooterClick}
          >
            {deleteConfirming ? '提交删除任务' : '继续确认删除'}
          </Button>,
        ]}
      >
        <div className="sf-filtered-bid-scope sf-filtered-delete-scope">
          <ExclamationCircleOutlined />
          <div>
            <b>删除操作会对当前筛选结果中的全部{currentLevelLabel}提交异步删除任务，请确认筛选条件准确。</b>
            <span>提交前不会逐条查询{currentLevelLabel}详情；无法删除的{currentLevelLabel}会记录为失败，并在任务结果中展示原因。</span>
          </div>
        </div>

        <div className="sf-filtered-bid-count sf-filtered-delete-count">
          <span>预计影响</span>
          <strong>{currentResultCount.toLocaleString()}</strong>
          <span>个{currentLevelLabel}</span>
        </div>

        <section className="sf-filtered-bid-form sf-delete-task-form">
          {!deleteConfirming && (
            <div className="sf-delete-task-risk">
              <b>删除说明</b>
              <span>任务将基于当前筛选条件快照圈定{currentLevelLabel}，按账号分组并每批最多10个{currentLevelLabel}异步调用巨量删除接口。</span>
            </div>
          )}
          {deleteConfirming && (
            <div className="sf-delete-second-confirm">
              <div className="sf-delete-second-title">请再次确认删除范围</div>
              <div className="sf-delete-second-count">
                将删除当前筛选结果中的 <strong>{currentResultCount.toLocaleString()}</strong> 个{currentLevelLabel}
              </div>
              <div className="sf-delete-second-desc">
                该操作提交后不可在弹窗内撤回，失败项目会在任务结果中展示原因。
              </div>
              <Checkbox checked={deleteConfirmed} onChange={(event) => setDeleteConfirmed(event.target.checked)}>
                我确认已核对筛选条件，并按当前筛选结果删除全部{currentLevelLabel}
              </Checkbox>
            </div>
          )}
        </section>

        <section className="sf-filtered-bid-summary">
          <div className="sf-filtered-bid-section-title">当前筛选条件快照</div>
          <div className="sf-filtered-bid-snapshot">
            {filterSnapshot.map((item) => (
              <div className="sf-filtered-bid-snapshot-item" key={item.label}>
                <span>{item.label}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>

        {latestDeleteTask && (
          <div className="sf-filtered-bid-task">
            任务已创建，后台将按账号分组并每10个{currentLevelLabel}一批执行。
          </div>
        )}
      </Modal>

      <Modal
        title="数据筛选"
        open={filterOpen}
        onCancel={() => setFilterOpen(false)}
        width={1000}
        centered
        className="sf-data-modal"
        footer={[
          <Button key="reset" type="text" icon={<ReloadOutlined />}>重置筛选项</Button>,
          <Button key="ok" type="primary" onClick={() => setFilterOpen(false)}>确定</Button>,
        ]}
      >
        <div className="sf-filter-alert">
          <ExclamationCircleOutlined />
          若广告本身未产生任何数据（如广告审核中），将会被系统当做空数据默认过滤
        </div>
        <div className="sf-data-filter-body">
          <aside>
            <b>媒体账户</b>
            {['总消费(元)', '转化成本', '转化数'].map((item, index) => (
              <button className={index === 0 ? 'active' : ''} key={item}>
                {item}
                {index === 0 && <CloseOutlined />}
              </button>
            ))}
            <button className="sf-more-metric">＋ 更多指标</button>
          </aside>
          <section>
            {['总消费(元)', '转化成本', '转化数'].map((item) => (
              <div className="sf-condition-row" key={item}>
                <label>{item}</label>
                <Select defaultValue="大于" options={[{ label: '大于', value: '大于' }, { label: '等于', value: '等于' }, { label: '小于', value: '小于' }]} />
                <InputNumber placeholder="请输入" controls={false} />
              </div>
            ))}
          </section>
        </div>
      </Modal>

      <Drawer
        title="任务详情"
        open={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
        width={920}
        className="sf-task-drawer"
      >
        {selectedTask && (
          <>
            <section className="sf-task-drawer-section">
              <div className="sf-task-drawer-title">基本信息</div>
              <div className="sf-task-basic-grid">
                <div>
                  <span>操作类型</span>
                  <b>{selectedTask.operationType}</b>
                </div>
                <div>
                  <span>操作人</span>
                  <b>{selectedTask.operator}</b>
                </div>
                <div>
                  <span>媒体</span>
                  <b>{selectedTask.media || '-'}</b>
                </div>
                <div>
                  <span>层级</span>
                  <b>{selectedTask.level || '-'}</b>
                </div>
                <div>
                  <span>任务状态</span>
                  <b>{selectedTask.status}</b>
                </div>
                <div>
                  <span>操作时间</span>
                  <b>{selectedTask.createdAt}</b>
                </div>
                <div>
                  <span>完成时间</span>
                  <b>{selectedTask.finishedAt || '-'}</b>
                </div>
                <div>
                  <span>操作参数</span>
                  <b>{selectedTask.paramsSummary || '-'}</b>
                </div>
              </div>

              {selectedTask.filterSnapshot && (
                <div className="sf-task-filter-snapshot">
                  {selectedTask.filterSnapshot.slice(0, 8).map((item) => (
                    <span key={item.label}>
                      {item.label}：{item.value}
                    </span>
                  ))}
                </div>
              )}

              <div className="sf-task-summary">
                <div className="sf-task-stat">
                  <span>总数</span>
                  <b>{selectedTask.totalCount.toLocaleString()}</b>
                </div>
                <div className="sf-task-stat">
                  <span>成功数</span>
                  <b>{selectedTask.successCount.toLocaleString()}</b>
                </div>
                <button className="sf-task-stat sf-task-stat--failed" onClick={focusFailedDetails}>
                  <span>失败数</span>
                  <b>{selectedTask.failedCount.toLocaleString()}</b>
                </button>
              </div>
            </section>

            <section className="sf-task-drawer-section sf-task-result-section">
              <div className="sf-task-result-head">
                <div className="sf-task-drawer-title">结果详情</div>
                <Checkbox
                  checked={taskDetailFailedOnly}
                  onChange={(event) => {
                    setTaskDetailFailedOnly(event.target.checked);
                    setTaskDetailPage(1);
                  }}
                >
                  只查看失败任务
                </Checkbox>
              </div>

              <div className="sf-task-detail-toolbar">
                <Input
                  placeholder="搜索广告/项目ID、名称"
                  value={taskDetailKeyword}
                  onChange={(event) => {
                    setTaskDetailKeyword(event.target.value);
                    setTaskDetailPage(1);
                  }}
                  suffix={<SearchOutlined />}
                />
                <span>已按分页加载明细，避免一次渲染大量记录</span>
              </div>

              <Table<TaskDetailRow>
                className="sf-task-detail-table"
                columns={taskDetailColumns}
                dataSource={pagedTaskDetails}
                pagination={false}
                rowKey="key"
                scroll={{ x: 1130 }}
                size="middle"
              />

              <div className="sf-task-detail-pagination">
                <span>共 {selectedTaskDetails.length.toLocaleString()} 条明细</span>
                <Pagination
                  current={taskDetailPage}
                  total={selectedTaskDetails.length}
                  pageSize={taskDetailPageSize}
                  showSizeChanger={false}
                  onChange={setTaskDetailPage}
                />
              </div>
            </section>
          </>
        )}
      </Drawer>

      <Modal
        title="自定义列"
        open={columnsOpen}
        onCancel={() => setColumnsOpen(false)}
        width={1080}
        centered
        className="sf-column-modal"
        footer={[
          <Button key="cancel" onClick={() => setColumnsOpen(false)}>取消</Button>,
          <Button key="ok" type="primary" onClick={() => setColumnsOpen(false)}>确定</Button>,
        ]}
      >
        <div className="sf-column-body">
          <section className="sf-column-left">
            <h3>可添加的列</h3>
            <Input placeholder="请输入搜索内容" />
            <div className="sf-column-group">属性</div>
            <div className="sf-column-grid">
              {attrColumns.map((item) => (
                <Checkbox
                  key={item}
                  checked={selectedColumns.includes(item)}
                  onChange={(event: CheckboxChangeEvent) => {
                    setSelectedColumns((prev) => event.target.checked ? [...prev, item] : prev.filter((col) => col !== item));
                  }}
                >
                  {item}
                </Checkbox>
              ))}
            </div>
            <div className="sf-column-group">媒体指标</div>
            <div className="sf-column-grid sf-column-grid--metrics">
              {metricColumns.map((item) => (
                <Checkbox
                  key={item}
                  checked={selectedColumns.includes(item)}
                  onChange={(event: CheckboxChangeEvent) => {
                    setSelectedColumns((prev) => event.target.checked ? [...prev, item] : prev.filter((col) => col !== item));
                  }}
                >
                  {item}
                </Checkbox>
              ))}
            </div>
          </section>
          <section className="sf-column-right">
            <div className="sf-selected-title">
              已选 {selectedColumns.length} 列
              <button onClick={() => setSelectedColumns([])}>清空全部</button>
            </div>
            <div className="sf-lock-tip">以上指标横向固定，最多3个</div>
            {selectedColumns.map((item) => (
              <div className="sf-selected-column" key={item}>
                <span>{item}</span>
                <CloseOutlined onClick={() => setSelectedColumns((prev) => prev.filter((col) => col !== item))} />
              </div>
            ))}
          </section>
        </div>
      </Modal>

      <div className="sf-floating-loader" aria-hidden>
        <LoadingOutlined />
      </div>
    </div>
  );
}
