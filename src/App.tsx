import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AppstoreOutlined,
  BellOutlined,
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
  UploadOutlined,
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
type PageView = 'promotion' | 'task' | 'tencentBatchCreate' | 'monitoringLinks';
type LevelKey = 'project' | 'unit';
type PromotionLevel = '项目' | '单元';
type TaskStatus = '成功' | '部分成功' | '失败' | '进行中' | '创建中';
type TaskOperationType =
  | '批量创建腾讯广告'
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
type TaskDetailStatus = '成功' | '失败' | '执行中';
type TencentMarketingCarrierType =
  | 'MARKETING_CARRIER_TYPE_JUMP_PAGE'
  | 'MARKETING_CARRIER_TYPE_APP_ANDROID'
  | 'MARKETING_CARRIER_TYPE_APP_IOS';
type TencentOptimizationGoal =
  | 'OPTIMIZATIONGOAL_PROMOTION_VIEW_KEY_PAGE'
  | 'OPTIMIZATIONGOAL_APP_DOWNLOAD'
  | 'OPTIMIZATIONGOAL_APP_ACTIVATE'
  | 'OPTIMIZATIONGOAL_APP_REGISTER'
  | 'OPTIMIZATIONGOAL_ONE_DAY_RETENTION'
  | 'OPTIMIZATIONGOAL_APP_PURCHASE';

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
  jumpType?: string;
  resourceId?: string;
  resourceName?: string;
  configWarning?: string;
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

interface TencentBatchTemplate {
  carrierType: TencentMarketingCarrierType;
  appId: string;
  optimizationGoal?: TencentOptimizationGoal;
  platformChannelAssetId: string;
}

type TencentResourceKind = 'APP_DIRECT' | 'LANDING_PAGE';
type TencentJumpType = 'ANDROID_DEFAULT' | 'JUMP_STORE' | 'APP_DIRECT' | 'OFFICIAL_LANDING' | 'ONE_CLICK';
type TencentLandingConfigRule = 'BY_ACCOUNT' | 'BY_AD' | 'BY_CREATIVE';
type TencentResourceStatus = '可用' | '审核中' | '已失效';

interface TencentMonitoringLinkGroup {
  id: string;
  name: string;
  accountId: string;
  clickTrackingUrl?: string;
  enterpriseWechatUrl?: string;
  officialAccountFollowUrl?: string;
  officialAccountWelcomeUrl?: string;
  videoAccountUrl?: string;
  attributionForwardUrl?: string;
  shopUrl?: string;
  appDirectUrl?: string;
  androidAppId?: string;
  iosAppId?: string;
  universalUrl?: string;
  fallbackLandingPageRef?: string;
  status: TencentResourceStatus;
  source: 'MOCK' | 'XLSX_IMPORT';
}

interface TencentBatchAccount {
  id: string;
  name: string;
  platform: 'Android' | 'iOS' | 'Android+iOS';
}

interface TencentResource {
  id: string;
  kind: TencentResourceKind;
  name: string;
  url: string;
  accountIds: string[];
  status: TencentResourceStatus;
  androidAppId?: string;
  iosAppId?: string;
  universalUrl?: string;
  fallbackLandingPageId?: string;
  fallbackLandingPageName?: string;
  monitoringLinkGroupId?: string;
  monitoringLinkGroup?: TencentMonitoringLinkGroup;
}

interface TencentAccountAssignment {
  jumpType: TencentJumpType;
  resourceIds: string[];
  fallbackResourceId?: string;
  monitoringLinkGroupId?: string;
}

interface TencentBatchDraft {
  accountIds: string[];
  targetingPackageIds: string[];
  titleCount: number;
  materialGroupCount: number;
  marketingGoal: string;
  promotionProduct: string;
  adName: string;
  creativeName: string;
  creativeCopy: string;
  brandJumpName: string;
  preselectedAppDirectId?: string;
  preselectedLandingPageId?: string;
  assignments: Record<string, TencentAccountAssignment>;
}

interface TencentBatchPreview {
  savedAt: string;
  account_id: string;
  adgroup_request: {
    marketing_goal: 'MARKETING_GOAL_USER_GROWTH';
    marketing_target_type: 'MARKETING_TARGET_TYPE_PLATFORM_CHANNEL';
    marketing_asset_id: number | string;
    marketing_carrier_type: TencentMarketingCarrierType;
    marketing_carrier_detail?: {
      marketing_carrier_id: string;
      marketing_sub_carrier_id?: string;
    };
    optimization_goal?: TencentOptimizationGoal;
    targeting?: {
      user_os: Array<'ANDROID' | 'IOS'>;
    };
  };
  dynamic_creative_request: {
    main_jump_info: Array<{
      value: {
        page_type: 'PAGE_TYPE_XJ_WEB_H5' | 'PAGE_TYPE_ANDROID_APP' | 'PAGE_TYPE_IOS_APP';
        page_spec: {
          h5_spec?: {
            page_url: string;
          };
          android_app_spec?: {
            android_app_id: string;
          };
          ios_app_spec?: {
            ios_app_id: string;
          };
        };
      };
    }>;
  };
}

const monitoringTemplateHeaders = [
  '媒体账户ID*',
  '监测链接组名称*',
  '点击监测链接',
  '企业微信监测链接',
  '公众号关注链接',
  '公众号欢迎语链接',
  '微信视频号链接',
  '归因转发链接',
  '微信小店链接',
  '*表示必填项，注意：不同营销载体可填写监测链接内容组合不同',
  '应用直达',
  'Android应用id',
  'iOS应用id',
  '通用链接页URL',
  '设置兜底落地页',
] as const;

interface MonitoringImportRow {
  rowNumber: number;
  accountId: string;
  groupName: string;
  appDirectUrl: string;
  androidAppId: string;
  iosAppId: string;
  universalUrl: string;
  fallbackLandingPageRef: string;
  errors: string[];
  group?: Omit<TencentMonitoringLinkGroup, 'id'>;
}

interface MonitoringImportPreview {
  fileName: string;
  sheetName: string;
  rows: MonitoringImportRow[];
}

const taskOperationOptions: TaskOperationType[] = [
  '批量创建腾讯广告',
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

const tencentCarrierOptions: Array<{ label: string; value: TencentMarketingCarrierType }> = [
  { label: '页面跳转', value: 'MARKETING_CARRIER_TYPE_JUMP_PAGE' },
  { label: 'Android 应用', value: 'MARKETING_CARRIER_TYPE_APP_ANDROID' },
  { label: 'iOS 应用', value: 'MARKETING_CARRIER_TYPE_APP_IOS' },
];

const tencentOptimizationGoalOptions: Array<{ label: string; value: TencentOptimizationGoal }> = [
  { label: '关键页面浏览', value: 'OPTIMIZATIONGOAL_PROMOTION_VIEW_KEY_PAGE' },
  { label: '下载', value: 'OPTIMIZATIONGOAL_APP_DOWNLOAD' },
  { label: '激活', value: 'OPTIMIZATIONGOAL_APP_ACTIVATE' },
  { label: '注册', value: 'OPTIMIZATIONGOAL_APP_REGISTER' },
  { label: '次日留存', value: 'OPTIMIZATIONGOAL_ONE_DAY_RETENTION' },
  { label: '付费次数', value: 'OPTIMIZATIONGOAL_APP_PURCHASE' },
];

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
  media = '巨量引擎',
  createdOffsetMinutes = -2,
  finishedOffsetMinutes = 0,
  details,
  successCount: requestedSuccessCount,
  failedCount: requestedFailedCount,
}: {
  taskId: string;
  operationType: TaskOperationType;
  affectedCount: number;
  operator: string;
  filterSnapshot?: Array<{ label: string; value: string }>;
  paramsSummary?: string;
  forceStatus?: TaskStatus;
  level?: PromotionLevel;
  media?: string;
  createdOffsetMinutes?: number;
  finishedOffsetMinutes?: number;
  details?: TaskDetailRow[];
  successCount?: number;
  failedCount?: number;
}): AsyncTaskRecord {
  const taskDetails = details ?? buildTaskDetails(operationType, level);
  const failedCount = requestedFailedCount ?? Math.max(1, Math.round(affectedCount * 0.014));
  const successCount = requestedSuccessCount ?? Math.max(0, affectedCount - failedCount);
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
    media,
    level,
    filterSnapshot,
    paramsSummary,
    details: taskDetails,
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

function isTencentAppCarrier(carrierType: TencentMarketingCarrierType) {
  return carrierType === 'MARKETING_CARRIER_TYPE_APP_ANDROID' || carrierType === 'MARKETING_CARRIER_TYPE_APP_IOS';
}

function getTencentCarrierLabel(carrierType: TencentMarketingCarrierType) {
  return tencentCarrierOptions.find((item) => item.value === carrierType)?.label || '页面跳转';
}

function getTencentAppIdLabel(carrierType: TencentMarketingCarrierType) {
  return carrierType === 'MARKETING_CARRIER_TYPE_APP_IOS' ? 'iOS 应用 ID' : 'Android 应用 ID';
}

function getTencentOptimizationOptions(carrierType: TencentMarketingCarrierType) {
  if (carrierType === 'MARKETING_CARRIER_TYPE_JUMP_PAGE') {
    return tencentOptimizationGoalOptions.filter((item) =>
      ['OPTIMIZATIONGOAL_PROMOTION_VIEW_KEY_PAGE', 'OPTIMIZATIONGOAL_APP_REGISTER'].includes(item.value),
    );
  }

  return tencentOptimizationGoalOptions.filter((item) =>
    [
      'OPTIMIZATIONGOAL_APP_DOWNLOAD',
      'OPTIMIZATIONGOAL_APP_ACTIVATE',
      'OPTIMIZATIONGOAL_APP_REGISTER',
      'OPTIMIZATIONGOAL_ONE_DAY_RETENTION',
      'OPTIMIZATIONGOAL_APP_PURCHASE',
    ].includes(item.value),
  );
}

function normalizeMarketingAssetId(value: string) {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

function buildTencentBatchPreview({
  carrierType,
  appId,
  optimizationGoal,
  platformChannelAssetId,
}: TencentBatchTemplate): TencentBatchPreview {
  const appCarrier = isTencentAppCarrier(carrierType);
  const isAndroid = carrierType === 'MARKETING_CARRIER_TYPE_APP_ANDROID';
  const isIos = carrierType === 'MARKETING_CARRIER_TYPE_APP_IOS';

  return {
    savedAt: formatNow(),
    account_id: '<ACCOUNT_ID>',
    adgroup_request: {
      marketing_goal: 'MARKETING_GOAL_USER_GROWTH',
      marketing_target_type: 'MARKETING_TARGET_TYPE_PLATFORM_CHANNEL',
      marketing_asset_id: normalizeMarketingAssetId(platformChannelAssetId),
      marketing_carrier_type: carrierType,
      ...(appCarrier
        ? {
            marketing_carrier_detail: {
              marketing_carrier_id: appId.trim(),
              marketing_sub_carrier_id: '',
            },
            targeting: {
              user_os: [isAndroid ? 'ANDROID' : 'IOS'],
            },
          }
        : {}),
      ...(optimizationGoal ? { optimization_goal: optimizationGoal } : {}),
    },
    dynamic_creative_request: {
      main_jump_info: [
        {
          value: {
            page_type: isAndroid ? 'PAGE_TYPE_ANDROID_APP' : isIos ? 'PAGE_TYPE_IOS_APP' : 'PAGE_TYPE_XJ_WEB_H5',
            page_spec: isAndroid
              ? {
                  android_app_spec: {
                    android_app_id: appId.trim(),
                  },
                }
              : isIos
                ? {
                    ios_app_spec: {
                      ios_app_id: appId.trim(),
                    },
                  }
                : {
                    h5_spec: {
                      page_url: '<PAGE_URL>',
                    },
                  },
          },
        },
      ],
    },
  };
}

const tencentBatchAccounts: TencentBatchAccount[] = [
  { id: '48694821', name: '内部测试户-可下发-焯文1', platform: 'Android+iOS' },
  { id: '68819951', name: '内部测试账号(三维)-长涛-下发关闭2', platform: 'Android+iOS' },
  { id: '68819948', name: '内部测试账号(三维)-长涛-下发关闭', platform: 'Android+iOS' },
];

const tencentBatchResources: TencentResource[] = [
  {
    id: 'APP-DIRECT-1001',
    kind: 'APP_DIRECT',
    name: '爱看超值优选-应用直达',
    url: 'https://m.example.com/app-direct/1001',
    accountIds: ['48694821', '68819951', '68819948'],
    status: '可用',
    androidAppId: 'android-demo-1001',
    iosAppId: 'ios-demo-1001',
    universalUrl: 'https://m.example.com/universal/1001',
    fallbackLandingPageId: 'LP-526',
    fallbackLandingPageName: '新人一分钱买-2222',
    monitoringLinkGroupId: 'APP-DIRECT-1001',
  },
  {
    id: 'APP-DIRECT-1002',
    kind: 'APP_DIRECT',
    name: '超值优选-Android专用直达',
    url: 'https://m.example.com/app-direct/1002',
    accountIds: ['48694821', '68819951'],
    status: '可用',
    androidAppId: 'android-demo-1002',
    universalUrl: 'https://m.example.com/universal/1002',
    fallbackLandingPageId: 'LP-526',
    fallbackLandingPageName: '新人一分钱买-2222',
    monitoringLinkGroupId: 'APP-DIRECT-1002',
  },
  {
    id: 'LP-526',
    kind: 'LANDING_PAGE',
    name: '新人一分钱买-2222',
    url: 'https://m.example.com/landing/526',
    accountIds: ['48694821', '68819951', '68819948'],
    status: '可用',
  },
  {
    id: 'LP-527',
    kind: 'LANDING_PAGE',
    name: '品牌官方落地页-测试',
    url: 'https://m.example.com/landing/527',
    accountIds: ['48694821', '68819948'],
    status: '审核中',
  },
];

function readMonitoringCell(row: unknown[], columnIndex: number) {
  const value = row[columnIndex];
  return value === undefined || value === null ? '' : String(value).trim();
}

function resourceToMonitoringLinkGroup(resource: TencentResource): TencentMonitoringLinkGroup {
  return {
    id: resource.monitoringLinkGroupId || resource.id,
    name: resource.monitoringLinkGroup?.name || resource.name,
    accountId: resource.monitoringLinkGroup?.accountId || resource.accountIds[0] || '',
    clickTrackingUrl: resource.monitoringLinkGroup?.clickTrackingUrl,
    enterpriseWechatUrl: resource.monitoringLinkGroup?.enterpriseWechatUrl,
    officialAccountFollowUrl: resource.monitoringLinkGroup?.officialAccountFollowUrl,
    officialAccountWelcomeUrl: resource.monitoringLinkGroup?.officialAccountWelcomeUrl,
    videoAccountUrl: resource.monitoringLinkGroup?.videoAccountUrl,
    attributionForwardUrl: resource.monitoringLinkGroup?.attributionForwardUrl,
    shopUrl: resource.monitoringLinkGroup?.shopUrl,
    appDirectUrl: resource.monitoringLinkGroup?.appDirectUrl || resource.url,
    androidAppId: resource.monitoringLinkGroup?.androidAppId || resource.androidAppId,
    iosAppId: resource.monitoringLinkGroup?.iosAppId || resource.iosAppId,
    universalUrl: resource.monitoringLinkGroup?.universalUrl || resource.universalUrl,
    fallbackLandingPageRef:
      resource.monitoringLinkGroup?.fallbackLandingPageRef || resource.fallbackLandingPageId || resource.fallbackLandingPageName,
    status: resource.status,
    source: resource.monitoringLinkGroup?.source || 'MOCK',
  };
}

function monitoringLinkGroupToResource(group: TencentMonitoringLinkGroup): TencentResource {
  return {
    id: group.id,
    kind: 'APP_DIRECT',
    name: group.name,
    url: group.appDirectUrl || '',
    accountIds: group.accountId ? [group.accountId] : [],
    status: group.status,
    androidAppId: group.androidAppId,
    iosAppId: group.iosAppId,
    universalUrl: group.universalUrl,
    fallbackLandingPageId: group.fallbackLandingPageRef,
    fallbackLandingPageName: group.fallbackLandingPageRef,
    monitoringLinkGroupId: group.id,
    monitoringLinkGroup: group,
  };
}

const initialTencentMonitoringLinkGroups = tencentBatchResources
  .filter((resource) => resource.kind === 'APP_DIRECT')
  .map(resourceToMonitoringLinkGroup);

async function parseMonitoringTemplate(file: File): Promise<MonitoringImportPreview> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellText: true, cellDates: false });
  const sheetName = '监测链接';
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`模板缺少“${sheetName}”页签`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headerRow = (rows[0] || []).map((value) => String(value ?? '').trim());
  const requiredHeaders = ['媒体账户ID*', '监测链接组名称*'];
  const missingHeaders = requiredHeaders.filter((header) => !headerRow.includes(header));
  if (missingHeaders.length > 0) throw new Error(`模板缺少必填表头：${missingHeaders.join('、')}`);

  const columnIndex = (header: string) => headerRow.indexOf(header);
  const read = (row: unknown[], header: string) => {
    const index = columnIndex(header);
    return index < 0 ? '' : readMonitoringCell(row, index);
  };

  const dataRows = rows.slice(1).filter((row) => row.some((value) => String(value ?? '').trim()));
  return {
    fileName: file.name,
    sheetName,
    rows: dataRows.map((row, index) => {
      const accountId = read(row, '媒体账户ID*');
      const groupName = read(row, '监测链接组名称*');
      const errors = [
        ...(!accountId ? ['缺少媒体账户ID'] : []),
        ...(!groupName ? ['缺少监测链接组名称'] : []),
      ];
      const group: Omit<TencentMonitoringLinkGroup, 'id'> = {
        name: groupName,
        accountId,
        clickTrackingUrl: read(row, '点击监测链接'),
        enterpriseWechatUrl: read(row, '企业微信监测链接'),
        officialAccountFollowUrl: read(row, '公众号关注链接'),
        officialAccountWelcomeUrl: read(row, '公众号欢迎语链接'),
        videoAccountUrl: read(row, '微信视频号链接'),
        attributionForwardUrl: read(row, '归因转发链接'),
        shopUrl: read(row, '微信小店链接'),
        appDirectUrl: read(row, '应用直达'),
        androidAppId: read(row, 'Android应用id'),
        iosAppId: read(row, 'iOS应用id'),
        universalUrl: read(row, '通用链接页URL'),
        fallbackLandingPageRef: read(row, '设置兜底落地页'),
        status: '可用',
        source: 'XLSX_IMPORT',
      };
      return {
        rowNumber: index + 2,
        accountId,
        groupName,
        appDirectUrl: group.appDirectUrl || '',
        androidAppId: group.androidAppId || '',
        iosAppId: group.iosAppId || '',
        universalUrl: group.universalUrl || '',
        fallbackLandingPageRef: group.fallbackLandingPageRef || '',
        errors,
        group,
      };
    }),
  };
}

function getTencentResourceMissingFields(resource?: TencentResource) {
  if (!resource || resource.kind !== 'APP_DIRECT') return [];
  return [
    !resource.url ? '应用直达' : '',
    !resource.androidAppId ? 'Android应用ID' : '',
    !resource.iosAppId ? 'iOS应用ID' : '',
    !resource.universalUrl ? '通用链接页URL' : '',
    !resource.fallbackLandingPageId ? '兜底落地页' : '',
  ].filter(Boolean);
}

function cloneTencentBatchDraft(draft: TencentBatchDraft): TencentBatchDraft {
  return JSON.parse(JSON.stringify(draft)) as TencentBatchDraft;
}

function createInitialTencentBatchDraft(): TencentBatchDraft {
  return {
    accountIds: tencentBatchAccounts.map((account) => account.id),
    targetingPackageIds: ['TARGET-1001'],
    titleCount: 1,
    materialGroupCount: 1,
    marketingGoal: '品牌宣传',
    promotionProduct: '商品',
    adName: '品牌宣传-商品聚合页-Android应用',
    creativeName: '爱看超值优选-组件化创意',
    creativeCopy: '新人一分钱买，轻松减脂，同一堂轻轻帮你科学瘦身！',
    brandJumpName: '爱看超值优选小店',
    preselectedAppDirectId: 'APP-DIRECT-1001',
    preselectedLandingPageId: 'LP-526',
    assignments: {},
  };
}

function getTencentBatchResource(resourceId?: string, resources: TencentResource[] = tencentBatchResources) {
  return resourceId ? resources.find((resource) => resource.id === resourceId) : undefined;
}

function getTencentJumpTypeLabel(jumpType: TencentJumpType) {
  return {
    ANDROID_DEFAULT: 'Android 默认下载页',
    JUMP_STORE: '跳转厂商商店',
    APP_DIRECT: '应用直达',
    OFFICIAL_LANDING: '官方落地页',
    ONE_CLICK: '一键下载',
  }[jumpType];
}

const tencentLandingConfigRules: Array<{ label: string; value: TencentLandingConfigRule }> = [
  { label: '按广告账号', value: 'BY_ACCOUNT' },
  { label: '按广告', value: 'BY_AD' },
  { label: '按广告创意', value: 'BY_CREATIVE' },
];

function isTencentResourceCompatible(resource: TencentResource, accountId: string) {
  return resource.accountIds.includes(accountId) && resource.status === '可用';
}

function buildTencentAssignment(
  accountId: string,
  draft: TencentBatchDraft,
  assignments: Record<string, TencentAccountAssignment>,
  resources: TencentResource[] = tencentBatchResources,
): TencentAccountAssignment | undefined {
  const appDirect = getTencentBatchResource(draft.preselectedAppDirectId, resources);
  const landingPage = getTencentBatchResource(draft.preselectedLandingPageId, resources);
  const selected = [appDirect, landingPage].find(
    (resource): resource is TencentResource => Boolean(resource && isTencentResourceCompatible(resource, accountId)),
  );
  if (!selected) return undefined;

  const existing = assignments[accountId];
  const resourceIds = [...(existing?.resourceIds || [])];
  if (!resourceIds.includes(selected.id)) resourceIds.push(selected.id);

  if (selected.kind === 'APP_DIRECT') {
    const fallbackId = landingPage && isTencentResourceCompatible(landingPage, accountId) ? landingPage.id : appDirect?.fallbackLandingPageId;
    if (fallbackId && !resourceIds.includes(fallbackId)) resourceIds.push(fallbackId);
    return {
      jumpType: 'APP_DIRECT',
      resourceIds,
      fallbackResourceId: fallbackId,
      monitoringLinkGroupId: selected.monitoringLinkGroupId,
    };
  }

  return {
    jumpType: 'OFFICIAL_LANDING',
    resourceIds,
    fallbackResourceId: existing?.fallbackResourceId,
  };
}

function validateTencentBatchDraft(draft: TencentBatchDraft, resources: TencentResource[] = tencentBatchResources): string[] {
  const errors: string[] = [];
  if (draft.accountIds.length === 0) errors.push('请至少选择一个广告账号');
  if (draft.targetingPackageIds.length === 0) errors.push('请至少选择一个定向包');
  if (draft.titleCount < 1) errors.push('创意标题数不能少于 1');
  if (draft.materialGroupCount < 1) errors.push('创意素材组数不能少于 1');
  if (!draft.adName.trim()) errors.push('请填写广告名称');
  if (!draft.creativeName.trim()) errors.push('请填写创意名称');
  if (!draft.creativeCopy.trim()) errors.push('请填写创意文案');

  draft.accountIds.forEach((accountId) => {
    const assignment = draft.assignments[accountId];
    const account = tencentBatchAccounts.find((item) => item.id === accountId);
    if (!assignment || assignment.resourceIds.length === 0) {
      errors.push(`${account?.name || accountId} 尚未配置跳转链接`);
      return;
    }
    const primary = getTencentBatchResource(assignment.resourceIds[0], resources);
    if (!primary || primary.status !== '可用') {
      errors.push(`${account?.name || accountId} 的跳转资源不可用`);
      return;
    }
  });

  return Array.from(new Set(errors));
}

function TencentBatchLegacySidebar({
  activeItem,
  onMonitoringLinks,
}: {
  activeItem?: string;
  onMonitoringLinks: () => void;
}) {
  const items = ['图文库', '文案库', '定向包', '应用包', '华为投放资产', '落地页', '小程序', '原生锚点', '监测链接', '资产授权管理'];
  return (
    <aside className="sf-batch-legacy-sidebar">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className={activeItem === item ? 'active' : ''}
          onClick={item === '监测链接' ? onMonitoringLinks : undefined}
        >
          {item}
        </button>
      ))}
      <div className="sf-batch-legacy-sidebar-group">报表</div>
      {['项目整体报表', '素材报表', '素材属性报表', '广告报表', '财务报表'].map((item) => (
        <button key={item} type="button">{item}</button>
      ))}
    </aside>
  );
}

function createEmptyMonitoringLinkGroup(): TencentMonitoringLinkGroup {
  return {
    id: '',
    name: '',
    accountId: '',
    status: '可用',
    source: 'MOCK',
  };
}

function TencentMonitoringLinkManagementPage({
  groups,
  onImportGroups,
  onSaveGroup,
  onDeleteGroup,
}: {
  groups: TencentMonitoringLinkGroup[];
  onImportGroups: (groups: TencentMonitoringLinkGroup[]) => void;
  onSaveGroup: (group: TencentMonitoringLinkGroup) => void;
  onDeleteGroup: (groupId: string) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<TencentResourceStatus | 'all'>('可用');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<MonitoringImportPreview | null>(null);
  const [importError, setImportError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<TencentMonitoringLinkGroup>(() => createEmptyMonitoringLinkGroup());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredGroups = useMemo(() => groups.filter((group) => {
    const searchText = `${group.id} ${group.name} ${group.accountId} ${group.appDirectUrl || ''}`.toLowerCase();
    const matchesKeyword = !keyword.trim() || searchText.includes(keyword.trim().toLowerCase());
    const matchesAccount = accountFilter === 'all' || group.accountId === accountFilter;
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;
    const matchesCarrier = carrierFilter === 'all' || (carrierFilter === 'app' ? Boolean(group.appDirectUrl) : !group.appDirectUrl);
    return matchesKeyword && matchesAccount && matchesStatus && matchesCarrier;
  }), [accountFilter, carrierFilter, groups, keyword, statusFilter]);

  const openEditor = (group?: TencentMonitoringLinkGroup) => {
    setEditor(group ? { ...group } : createEmptyMonitoringLinkGroup());
    setEditorOpen(true);
  };

  const updateEditorField = <K extends keyof TencentMonitoringLinkGroup>(key: K, value: TencentMonitoringLinkGroup[K]) => {
    setEditor((previous) => ({ ...previous, [key]: value }));
  };

  const saveEditor = () => {
    if (!editor.accountId.trim() || !editor.name.trim()) {
      message.warning('请填写媒体账户ID和监测链接组名称');
      return;
    }
    onSaveGroup({
      ...editor,
      id: editor.id || `MLG-MOCK-${Date.now()}`,
      name: editor.name.trim(),
      accountId: editor.accountId.trim(),
    });
    setEditorOpen(false);
    message.success(editor.id ? '监测链接组已更新' : '监测链接组已创建');
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([[
      ...monitoringTemplateHeaders,
    ], new Array(monitoringTemplateHeaders.length).fill('')]);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
      { wch: 30 }, { wch: 60 }, { wch: 42 }, { wch: 20 }, { wch: 20 }, { wch: 26 }, { wch: 26 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '监测链接');
    XLSX.writeFile(workbook, '批量导入广点通监测链接模板.xlsx');
    message.success('模板已下载');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportError('');
    setImportPreview(null);
    try {
      setImportPreview(await parseMonitoringTemplate(file));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '模板解析失败，请检查文件格式');
    }
  };

  const confirmImport = () => {
    if (!importPreview) return;
    const validRows = importPreview.rows.filter((row) => row.errors.length === 0 && row.group);
    const stamp = Date.now();
    onImportGroups(validRows.map((row, index) => ({
      id: `MLG-${stamp}-${index + 1}`,
      ...(row.group as Omit<TencentMonitoringLinkGroup, 'id'>),
    })));
    setImportOpen(false);
    setImportPreview(null);
    setImportError('');
    message.success(`已追加导入 ${validRows.length} 个监测链接组`);
  };

  const renderEditorField = (label: string, key: keyof TencentMonitoringLinkGroup, placeholder = '') => {
    const value = editor[key];
    return (
      <label className="sf-monitoring-editor-field" key={String(key)}>
        <span>{label}</span>
        <Input
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(event) => updateEditorField(key, event.target.value)}
        />
      </label>
    );
  };

  const tableColumns: ColumnsType<TencentMonitoringLinkGroup> = [
    { title: '监测链接组ID', dataIndex: 'id', width: 150 },
    { title: '监测链接组名称', dataIndex: 'name', width: 220, ellipsis: true },
    { title: '营销载体类型', width: 130, render: (_, group) => group.appDirectUrl ? 'Android应用' : '网页' },
    {
      title: '账号',
      dataIndex: 'accountId',
      width: 190,
      render: (value: string) => {
        const account = tencentBatchAccounts.find((item) => item.id === value);
        return account ? `${account.name}（${value}）` : value || '-';
      },
    },
    {
      title: '点击',
      dataIndex: 'clickTrackingUrl',
      width: 250,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '应用直达',
      dataIndex: 'appDirectUrl',
      width: 220,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    { title: 'Android应用ID', dataIndex: 'androidAppId', width: 150, render: (value?: string) => value || '-' },
    { title: 'iOS应用ID', dataIndex: 'iosAppId', width: 150, render: (value?: string) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: TencentResourceStatus) => <span className={`sf-monitoring-status sf-monitoring-status--${value}`}>{value === '可用' ? '正常' : value}</span>,
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      render: (_, group) => (
        <div className="sf-monitoring-row-actions">
          <button type="button" onClick={() => openEditor(group)}>编辑</button>
          <button
            type="button"
            onClick={() => Modal.confirm({
              title: '确认删除监测链接组？',
              content: `删除后“${group.name}”不会再出现在应用直达资源选择中。`,
              okText: '删除',
              cancelText: '取消',
              onOk: () => {
                onDeleteGroup(group.id);
                message.success('监测链接组已删除');
              },
            })}
          >删除</button>
        </div>
      ),
    },
  ];

  const validImportCount = importPreview?.rows.filter((row) => row.errors.length === 0).length || 0;
  const invalidImportCount = importPreview?.rows.filter((row) => row.errors.length > 0).length || 0;

  return (
    <section className="sf-monitoring-page">
      <div className="sf-monitoring-title-row"><h1>监测链接管理</h1></div>
      <div className="sf-monitoring-channel-tabs">
        {['巨量引擎', '磁力引擎', '粉丝通', '腾讯广告'].map((channel) => <button className={channel === '腾讯广告' ? 'active' : ''} type="button" key={channel}>{channel}</button>)}
      </div>
      <div className="sf-monitoring-filter-row">
        <label>媒体账户：<Select value={accountFilter} onChange={setAccountFilter} options={[{ label: '全部', value: 'all' }, ...tencentBatchAccounts.map((account) => ({ label: account.name, value: account.id }))]} /></label>
        <label>状态：<Select value={statusFilter} onChange={setStatusFilter} options={[{ label: '正常', value: '可用' }, { label: '审核中', value: '审核中' }, { label: '已失效', value: '已失效' }, { label: '全部', value: 'all' }]} /></label>
        <label>营销载体类型：<Select value={carrierFilter} onChange={setCarrierFilter} options={[{ label: '全部', value: 'all' }, { label: 'Android应用', value: 'app' }, { label: '网页', value: 'web' }]} /></label>
        <Input className="sf-monitoring-search" placeholder="搜索组名称 / ID / 链接" value={keyword} onChange={(event) => setKeyword(event.target.value)} prefix={<SearchOutlined />} />
        <Button onClick={() => message.success('刷新成功')}>刷新</Button>
      </div>
      <div className="sf-monitoring-action-row">
        <Button type="primary" onClick={() => openEditor()}>创建监测链接</Button>
        <Button type="primary" onClick={() => { setImportOpen(true); setImportError(''); setImportPreview(null); }}>批量创建监测链接</Button>
        <Button onClick={downloadTemplate}>下载批量导入监测模板</Button>
        <Button icon={<UploadOutlined />} onClick={() => { setImportOpen(true); setImportError(''); setImportPreview(null); }}>上传模板</Button>
      </div>
      <div className="sf-monitoring-batch-bar"><Button>批量操作</Button><span>共 {filteredGroups.length} 个监测链接组</span></div>
      <Table<TencentMonitoringLinkGroup> className="sf-monitoring-table" rowKey="id" columns={tableColumns} dataSource={filteredGroups} pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `共 ${total} 条记录` }} scroll={{ x: 1650, y: 510 }} />

      <Modal
        title="批量导入监测链接"
        open={importOpen}
        width={1180}
        centered
        onCancel={() => { setImportOpen(false); setImportPreview(null); setImportError(''); }}
        footer={[
          <Button key="cancel" onClick={() => { setImportOpen(false); setImportPreview(null); setImportError(''); }}>取消</Button>,
          <Button key="confirm" type="primary" disabled={!importPreview || validImportCount === 0} onClick={confirmImport}>确认追加导入</Button>,
        ]}
      >
        <div className="sf-monitoring-import-toolbar">
          <Button onClick={downloadTemplate}>下载模板</Button>
          <Button type="primary" icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>选择文件</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
          <span>{importPreview?.fileName || '支持 .xlsx / .xls，要求包含“监测链接”页签'}</span>
        </div>
        {importError && <div className="sf-monitoring-import-error">{importError}</div>}
        {importPreview && (
          <div className="sf-monitoring-import-preview">
            <div className="sf-monitoring-import-summary"><b>解析结果</b><span>页签：{importPreview.sheetName}</span><span>总行数：{importPreview.rows.length}</span><span className="is-success">可导入：{validImportCount}</span><span className="is-error">错误：{invalidImportCount}</span></div>
            <Table<MonitoringImportRow>
              rowKey="rowNumber"
              size="small"
              pagination={false}
              scroll={{ x: 1250, y: 360 }}
              dataSource={importPreview.rows}
              columns={[
                { title: '行号', dataIndex: 'rowNumber', width: 60 },
                { title: '媒体账户ID', dataIndex: 'accountId', width: 140 },
                { title: '监测链接组名称', dataIndex: 'groupName', width: 180, ellipsis: true },
                { title: '应用直达', dataIndex: 'appDirectUrl', width: 220, ellipsis: true, render: (value: string) => value || '-' },
                { title: 'Android应用ID', dataIndex: 'androidAppId', width: 140, render: (value: string) => value || '-' },
                { title: 'iOS应用ID', dataIndex: 'iosAppId', width: 140, render: (value: string) => value || '-' },
                { title: '通用链接页URL', dataIndex: 'universalUrl', width: 220, ellipsis: true, render: (value: string) => value || '-' },
                { title: '兜底落地页', dataIndex: 'fallbackLandingPageRef', width: 140, render: (value: string) => value || '-' },
                { title: '校验结果', width: 180, render: (_, row) => row.errors.length ? <span className="sf-monitoring-import-row-error">{row.errors.join('、')}</span> : <span className="sf-monitoring-import-row-ok">可追加</span> },
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal title={editor.id ? '编辑监测链接' : '创建监测链接'} open={editorOpen} width={880} centered onCancel={() => setEditorOpen(false)} onOk={saveEditor} okText="确定" cancelText="取消">
        <div className="sf-monitoring-editor-grid">
          {renderEditorField('媒体账户ID*', 'accountId', '请输入媒体账户ID')}
          {renderEditorField('监测链接组名称*', 'name', '请输入监测链接组名称')}
          {renderEditorField('点击监测链接', 'clickTrackingUrl')}
          {renderEditorField('企业微信监测链接', 'enterpriseWechatUrl')}
          {renderEditorField('公众号关注链接', 'officialAccountFollowUrl')}
          {renderEditorField('公众号欢迎语链接', 'officialAccountWelcomeUrl')}
          {renderEditorField('微信视频号链接', 'videoAccountUrl')}
          {renderEditorField('归因转发链接', 'attributionForwardUrl')}
          {renderEditorField('微信小店链接', 'shopUrl')}
          {renderEditorField('应用直达', 'appDirectUrl')}
          {renderEditorField('Android应用id', 'androidAppId')}
          {renderEditorField('iOS应用id', 'iosAppId')}
          {renderEditorField('通用链接页URL', 'universalUrl')}
          {renderEditorField('设置兜底落地页', 'fallbackLandingPageRef')}
          <label className="sf-monitoring-editor-field"><span>状态</span><Select value={editor.status} onChange={(value) => updateEditorField('status', value)} options={[{ label: '正常', value: '可用' }, { label: '审核中', value: '审核中' }, { label: '已失效', value: '已失效' }]} /></label>
        </div>
      </Modal>
    </section>
  );
}

function TencentBatchCreatePage({
  onBack,
  onCreateTask,
  resources,
}: {
  onBack: () => void;
  onCreateTask: (task: AsyncTaskRecord) => void;
  resources: TencentResource[];
}) {
  const [draft, setDraft] = useState<TencentBatchDraft>(() => createInitialTencentBatchDraft());
  const [savedTemplate, setSavedTemplate] = useState<TencentBatchDraft | null>(null);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [resourcePickerKind, setResourcePickerKind] = useState<TencentResourceKind>('APP_DIRECT');
  const [resourcePickerSelection, setResourcePickerSelection] = useState<string>();
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [accountPickerSelection, setAccountPickerSelection] = useState<string[]>(draft.accountIds);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentDraft, setAssignmentDraft] = useState<Record<string, TencentAccountAssignment>>({});
  const [assignmentAccountId, setAssignmentAccountId] = useState(draft.accountIds[0]);
  const [manualResourceId, setManualResourceId] = useState<string>();
  const [assignmentNotice, setAssignmentNotice] = useState('');
  const [landingConfigRule, setLandingConfigRule] = useState<TencentLandingConfigRule>('BY_ACCOUNT');
  const [landingConfigKind, setLandingConfigKind] = useState<TencentResourceKind>('APP_DIRECT');
  const [landingResourceSelection, setLandingResourceSelection] = useState<string[]>([]);
  const [landingConfigSearch, setLandingConfigSearch] = useState('');
  const [landingPageCount, setLandingPageCount] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [lastTaskId, setLastTaskId] = useState('');

  const selectedAccounts = useMemo(
    () => tencentBatchAccounts.filter((account) => draft.accountIds.includes(account.id)),
    [draft.accountIds],
  );
  const preselectedAppDirect = getTencentBatchResource(draft.preselectedAppDirectId, resources);
  const preselectedLandingPage = getTencentBatchResource(draft.preselectedLandingPageId, resources);
  const expectedAds = draft.accountIds.length * draft.targetingPackageIds.length * draft.titleCount * draft.materialGroupCount;
  const currentAssignment = assignmentDraft[assignmentAccountId];
  const currentAccount = tencentBatchAccounts.find((account) => account.id === assignmentAccountId);
  const assignmentCount = draft.accountIds.filter((accountId) => draft.assignments[accountId]?.resourceIds.length).length;
  const landingConfigResources = resources.filter((resource) => {
    if (resource.kind !== landingConfigKind) return false;
    const keyword = landingConfigSearch.trim().toLowerCase();
    return !keyword || `${resource.name} ${resource.id} ${resource.url}`.toLowerCase().includes(keyword);
  });
  const landingSelectedResources = landingResourceSelection
    .map((resourceId) => getTencentBatchResource(resourceId, resources))
    .filter((resource): resource is TencentResource => Boolean(resource));

  const openResourcePicker = (kind: TencentResourceKind) => {
    setResourcePickerKind(kind);
    const currentId = kind === 'APP_DIRECT' ? draft.preselectedAppDirectId : draft.preselectedLandingPageId;
    setResourcePickerSelection(currentId);
    setResourcePickerOpen(true);
  };

  const confirmResourcePicker = () => {
    setDraft((previous) => ({
      ...previous,
      ...(resourcePickerKind === 'APP_DIRECT'
        ? { preselectedAppDirectId: resourcePickerSelection }
        : { preselectedLandingPageId: resourcePickerSelection }),
    }));
    setResourcePickerOpen(false);
  };

  const openAccountPicker = () => {
    setAccountPickerSelection(draft.accountIds);
    setAccountPickerOpen(true);
  };

  const confirmAccountPicker = () => {
    setDraft((previous) => ({
      ...previous,
      accountIds: accountPickerSelection,
      assignments: Object.fromEntries(
        Object.entries(previous.assignments).filter(([accountId]) => accountPickerSelection.includes(accountId)),
      ),
    }));
    if (!accountPickerSelection.includes(assignmentAccountId)) setAssignmentAccountId(accountPickerSelection[0] || '');
    setAccountPickerOpen(false);
    setValidationErrors([]);
  };

  const clearRules = () => {
    Modal.confirm({
      title: '确认清空规则？',
      content: '将清空当前账号、定向包、创意和跳转资源配置，已保存的规则模板不会受影响。',
      okText: '清空',
      cancelText: '取消',
      onOk: () => {
        setDraft({
          ...createInitialTencentBatchDraft(),
          accountIds: [],
          preselectedAppDirectId: undefined,
          preselectedLandingPageId: undefined,
          assignments: {},
        });
        setAssignmentAccountId('');
        setValidationErrors([]);
        setLastTaskId('');
      },
    });
  };

  const saveAsTemplate = () => {
    setSavedTemplate(cloneTencentBatchDraft(draft));
    message.success('规则模板已保存');
  };

  const updateTemplate = () => {
    if (!savedTemplate) {
      message.warning('暂无可更新的规则模板');
      return;
    }
    setSavedTemplate(cloneTencentBatchDraft(draft));
    message.success('规则模板已更新');
  };

  const applyTemplate = () => {
    if (!savedTemplate) {
      message.warning('暂无可引用的规则模板');
      return;
    }
    setDraft(cloneTencentBatchDraft(savedTemplate));
    setAssignmentAccountId(savedTemplate.accountIds[0] || '');
    setValidationErrors([]);
    message.success('已引用规则模板');
  };

  const getDraftWithLandingSelection = () => ({
    ...draft,
    ...(landingConfigKind === 'APP_DIRECT'
      ? { preselectedAppDirectId: landingResourceSelection[0] }
      : { preselectedLandingPageId: landingResourceSelection[0] }),
  });

  const calculateOneClickAssignments = (
    source: Record<string, TencentAccountAssignment>,
    sourceDraft: TencentBatchDraft = draft,
  ) => {
    let assigned = 0;
    let skipped = 0;
    const nextAssignments = { ...source };
    sourceDraft.accountIds.forEach((accountId) => {
      const existing = nextAssignments[accountId];
      if (existing?.resourceIds.length) {
        skipped += 1;
        return;
      }
      const next = buildTencentAssignment(accountId, sourceDraft, nextAssignments, resources);
      if (!next) {
        skipped += 1;
        return;
      }
      nextAssignments[accountId] = next;
      assigned += 1;
    });
    return { nextAssignments, assigned, skipped };
  };

  const openAssignment = (autoAssign = false) => {
    const baseAssignments = cloneTencentBatchDraft(draft).assignments;
    setLandingConfigRule('BY_ACCOUNT');
    setLandingConfigKind('APP_DIRECT');
    setLandingResourceSelection(draft.preselectedAppDirectId ? [draft.preselectedAppDirectId] : []);
    setLandingConfigSearch('');
    setLandingPageCount(1);
    if (autoAssign) {
      const result = calculateOneClickAssignments(baseAssignments);
      setAssignmentDraft(result.nextAssignments);
      setAssignmentNotice(`已自动分配 ${result.assigned}/${draft.accountIds.length} 个账号${result.skipped ? `，跳过 ${result.skipped} 个（已有配置或资源不兼容）` : ''}`);
    } else {
      setAssignmentDraft(baseAssignments);
      setAssignmentNotice('');
    }
    setAssignmentAccountId(draft.accountIds[0] || '');
    setManualResourceId(undefined);
    setAssignmentOpen(true);
  };

  const oneClickAssign = () => {
    if (!landingResourceSelection[0]) {
      message.warning(`请先选择${landingConfigKind === 'APP_DIRECT' ? '应用直达' : '官方落地页'}资源`);
      return;
    }
    const configDraft = getDraftWithLandingSelection();
    const result = calculateOneClickAssignments(assignmentDraft, configDraft);
    setDraft(configDraft);
    setAssignmentDraft(result.nextAssignments);
    setAssignmentNotice(`已分配 ${result.assigned}/${configDraft.accountIds.length} 个账号${result.skipped ? `，跳过 ${result.skipped} 个（已有配置或资源不兼容）` : ''}`);
  };

  const addResourceToAssignment = (resourceId?: string) => {
    if (!resourceId || !assignmentAccountId) return;
    const resource = getTencentBatchResource(resourceId, resources);
    if (!resource || !isTencentResourceCompatible(resource, assignmentAccountId)) {
      message.warning('该资源不可用于当前账号');
      return;
    }
    setAssignmentDraft((previous) => {
      const existing = previous[assignmentAccountId];
      const resourceIds = Array.from(new Set([...(existing?.resourceIds || []), resource.id]));
      return {
        ...previous,
        [assignmentAccountId]: {
          jumpType: resource.kind === 'APP_DIRECT' ? 'APP_DIRECT' : 'OFFICIAL_LANDING',
          resourceIds,
          fallbackResourceId: existing?.fallbackResourceId || resource.fallbackLandingPageId,
          monitoringLinkGroupId: resource.monitoringLinkGroupId,
        },
      };
    });
    setManualResourceId(undefined);
  };

  const addManualResource = () => addResourceToAssignment(manualResourceId);

  const removeAssignmentResource = (resourceId: string) => {
    if (!assignmentAccountId) return;
    setAssignmentDraft((previous) => {
      const existing = previous[assignmentAccountId];
      if (!existing) return previous;
      const resourceIds = existing.resourceIds.filter((id) => id !== resourceId);
      if (resourceIds.length === 0) {
        const next = { ...previous };
        delete next[assignmentAccountId];
        return next;
      }
      return {
        ...previous,
        [assignmentAccountId]: {
          ...existing,
          resourceIds,
          fallbackResourceId: existing.fallbackResourceId === resourceId ? undefined : existing.fallbackResourceId,
        },
      };
    });
  };

  const confirmAssignments = () => {
    const configDraft = getDraftWithLandingSelection();
    setDraft({ ...configDraft, assignments: assignmentDraft });
    setAssignmentOpen(false);
    setValidationErrors([]);
  };

  const handleCreate = () => {
    const errors = validateTencentBatchDraft(draft, resources);
    setValidationErrors(errors);
    if (errors.length > 0) {
      message.warning(`还有 ${errors.length} 项配置需要完善`);
      return;
    }

    const taskId = `TX-BATCH-${Date.now().toString().slice(-8)}`;
    const details: TaskDetailRow[] = draft.accountIds.map((accountId, index) => {
      const account = tencentBatchAccounts.find((item) => item.id === accountId)!;
      const assignment = draft.assignments[accountId];
      const primary = getTencentBatchResource(assignment.resourceIds[0], resources);
      const missingFields = assignment.jumpType === 'APP_DIRECT' ? getTencentResourceMissingFields(primary) : [];
      return {
        key: `${taskId}-${accountId}`,
        resultStatus: '执行中',
        objectId: `待生成-${index + 1}`,
        objectName: draft.adName,
        accountId,
        accountName: account.name,
        failReason: '',
        executedAt: formatNow(),
        jumpType: getTencentJumpTypeLabel(assignment.jumpType),
        resourceId: primary?.id,
        resourceName: primary?.name,
        configWarning: missingFields.length > 0 ? `Mock 预览：缺少 ${missingFields.join('、')}` : '',
      };
    });
    const task = createTaskRecord({
      taskId,
      operationType: '批量创建腾讯广告',
      affectedCount: expectedAds,
      operator: operatorName,
      filterSnapshot: [
        { label: '媒体', value: '腾讯广告' },
        { label: '账号数', value: String(draft.accountIds.length) },
        { label: '定向包数', value: String(draft.targetingPackageIds.length) },
        { label: '标题包数', value: String(draft.titleCount) },
        { label: '素材组数', value: String(draft.materialGroupCount) },
        { label: '预选应用直达', value: preselectedAppDirect?.name || '-' },
        { label: '预选落地页', value: preselectedLandingPage?.name || '-' },
      ],
      paramsSummary: `${draft.marketingGoal} / ${draft.promotionProduct} / ${expectedAds} 个广告`,
      forceStatus: '创建中',
      media: '腾讯广告',
      level: '单元',
      details,
      successCount: 0,
      failedCount: 0,
    });
    onCreateTask(task);
    setLastTaskId(taskId);
    message.success('腾讯广告批量创建任务已生成');
  };

  const assignmentResources = currentAssignment?.resourceIds
    .map((resourceId) => getTencentBatchResource(resourceId, resources))
    .filter((resource): resource is TencentResource => Boolean(resource));
  const manualResourceOptions = resources.filter((resource) =>
    assignmentAccountId ? isTencentResourceCompatible(resource, assignmentAccountId) : false,
  );

  return (
    <section className="sf-batch-create-page">
      <div className="sf-batch-create-title-row">
        <h1>批量创建</h1>
      </div>

      <div className="sf-batch-create-count-tip">
        <span className="sf-batch-info-icon">i</span>
        <b>预计广告数量 = {expectedAds} 个</b>
        <span>预计创建广告数量 = 账号 {draft.accountIds.length} × 定向包 {draft.targetingPackageIds.length} × 标题包 {draft.titleCount} × 创意素材 {draft.materialGroupCount} = {expectedAds} 个</span>
      </div>

      <div className="sf-batch-create-toolbar">
        <span className="sf-batch-toolbar-label">选择媒体</span>
        <Select className="sf-batch-media-select" value="腾讯广告" options={[{ label: '腾讯广告', value: '腾讯广告' }]} />
        <Button type="primary" onClick={applyTemplate}>引用规则模板</Button>
        <Button type="primary" onClick={() => setAuthOpen(true)}>身份认证</Button>
        <Select className="sf-batch-toolbar-rule-select" placeholder=" " options={[]} />
        <span className="sf-batch-create-mode-label"><span>?</span> 创建方式</span>
        <Select value="LANDING_CONFIG" options={[{ label: '分落地页配置', value: 'LANDING_CONFIG' }]} />
        <Button onClick={clearRules}>清空规则</Button>
      </div>

      {validationErrors.length > 0 && (
        <div className="sf-batch-create-errors">
          <b>请先完善以下配置：</b>
          {validationErrors.map((error) => <span key={error}>{error}</span>)}
        </div>
      )}

      <div className="sf-batch-create-grid">
        <div className="sf-batch-grid-group sf-batch-grid-group--account">设置账号与广告</div>
        <div className="sf-batch-grid-group sf-batch-grid-group--ad">设置广告</div>
        <div className="sf-batch-grid-group sf-batch-grid-group--creative">设置创意素材</div>
        <div className="sf-batch-grid-group sf-batch-grid-group--landing" aria-hidden="true" />

        <section className="sf-batch-column sf-batch-column--accounts">
          <div className="sf-batch-subheader">
            <b>账号 {draft.accountIds.length}</b>
            <span><button type="button" onClick={openAccountPicker}>添加</button><button type="button" onClick={() => setDraft((previous) => ({ ...previous, accountIds: [], assignments: {} }))}>清空</button></span>
          </div>
          <div className="sf-batch-account-list">
            {selectedAccounts.length === 0 && <div className="sf-batch-empty">请添加广告账号</div>}
            {selectedAccounts.map((account) => (
              <div className="sf-batch-account-card" key={account.id}>
                <div><b>{account.name}</b><span>id：{account.id}</span></div>
                <button type="button" onClick={() => setDraft((previous) => ({ ...previous, accountIds: previous.accountIds.filter((id) => id !== account.id), assignments: Object.fromEntries(Object.entries(previous.assignments).filter(([id]) => id !== account.id)) }))}><CloseOutlined /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="sf-batch-column sf-batch-column--basic">
          <div className="sf-batch-subheader"><b>广告基本信息</b><button type="button">编辑</button></div>
          <div className="sf-batch-basic-info">
            <dl>
              <dt>创建方式</dt><dd>新建广告</dd>
              <dt>多账号分配</dt><dd>多账号一致</dd>
              <dt>营销目的</dt><dd>{draft.marketingGoal}</dd>
              <dt>推广产品</dt><dd>{draft.promotionProduct}</dd>
              <dt>营销载体类型</dt><dd>Android 应用</dd>
              <dt>广告版位</dt><dd>自动版位</dd>
              <dt>探索策略</dt><dd>自动探索</dd>
              <dt>RTA 策略</dt><dd>开启</dd>
              <dt>计费方式</dt><dd>oCPM</dd>
              <dt>出价策略</dt><dd>稳定拿量</dd>
              <dt>广告日预算</dt><dd>不限</dd>
              <dt>投放日期</dt><dd>长期投放</dd>
            </dl>
          </div>
        </section>

        <section className="sf-batch-column sf-batch-column--target">
          <div className="sf-batch-subheader"><b>定向包 {draft.targetingPackageIds.length}</b><span><button type="button" onClick={() => setDraft((previous) => ({ ...previous, targetingPackageIds: ['TARGET-1001'] }))}>添加</button><button type="button" onClick={() => setDraft((previous) => ({ ...previous, targetingPackageIds: [] }))}>清空</button></span></div>
          <div className="sf-batch-target-card">
            <div className="sf-batch-target-select">程序化分配 <DownOutlined /></div>
            <div className="sf-batch-target-chip">品牌宣传-商品聚合页-Android应用 <CloseOutlined /></div>
          </div>
        </section>

        <section className="sf-batch-column sf-batch-column--creative-basic">
          <div className="sf-batch-subheader"><b>创意基本信息</b><button type="button">编辑</button></div>
          <div className="sf-batch-basic-info">
            <dl>
              <dt>开启状态</dt><dd>关闭</dd>
              <dt>加上随机ID后缀</dt><dd>是</dd>
              <dt>投放模式</dt><dd>组件化创意</dd>
              <dt>广告含创意数</dt><dd>{draft.titleCount}</dd>
              <dt>创意含素材数</dt><dd>{draft.materialGroupCount}</dd>
              <dt>创意含标题数</dt><dd>{draft.titleCount}</dd>
              <dt>指定创意形式</dt><dd>关闭</dd>
              <dt>落地页</dt><dd>{preselectedLandingPage ? '已设置' : '待设置'}</dd>
              <dt>数据外显</dt><dd>关闭</dd>
            </dl>
          </div>
        </section>

        <section className="sf-batch-column sf-batch-column--copy">
          <div className="sf-batch-subheader"><b>创意文案</b><button type="button">添加</button></div>
          <div className="sf-batch-copy-body">
            <div className="sf-batch-copy-fixed-label">固定文案：</div>
            <Input.TextArea rows={7} value={draft.creativeCopy} onChange={(event) => setDraft((previous) => ({ ...previous, creativeCopy: event.target.value }))} />
          </div>
        </section>

        <section className="sf-batch-column sf-batch-column--material">
          <div className="sf-batch-subheader"><b>创意素材 {draft.materialGroupCount} 组</b><span><button type="button">添加</button><button type="button">清空</button></span></div>
          <div className="sf-batch-material-list">
            <div className="sf-batch-material-card"><div><span className="sf-batch-material-thumb">▶</span><b>创意1：</b><small>视频素材-测试</small></div><button type="button">×</button></div>
          </div>
        </section>

        <section className="sf-batch-column sf-batch-column--landing">
          <div className="sf-batch-subheader"><b>落地页配置</b><button type="button" onClick={() => openAssignment(false)}>添加</button></div>
          <div className="sf-batch-landing-config-body">
            {preselectedAppDirect ? (
              <div className="sf-batch-landing-resource-chip">
                <span>应用直达</span>
                <b>{preselectedAppDirect.name}</b>
                <small>{preselectedAppDirect.monitoringLinkGroupId ? `监测链接组：${preselectedAppDirect.monitoringLinkGroupId}` : preselectedAppDirect.id}</small>
                <em>Android：{preselectedAppDirect.androidAppId || '未配置'} · iOS：{preselectedAppDirect.iosAppId || '未配置'}</em>
                <em>通用链接：{preselectedAppDirect.universalUrl || '未配置'} · 兜底：{preselectedAppDirect.fallbackLandingPageName || '未配置'}</em>
              </div>
            ) : null}
            {preselectedLandingPage ? (
              <div className="sf-batch-landing-resource-chip">
                <span>官方落地页</span>
                <b>{preselectedLandingPage.name}</b>
                <small>{preselectedLandingPage.id}</small>
              </div>
            ) : null}
            {!preselectedAppDirect && !preselectedLandingPage && <div className="sf-batch-landing-empty">暂未配置落地页或应用直达</div>}
            <div className="sf-batch-landing-match-count">已匹配账号：{assignmentCount}/{draft.accountIds.length}</div>
          </div>
        </section>
      </div>

      <div className="sf-batch-create-footer">
        <Button onClick={onBack}>返回</Button>
        <Button disabled={!savedTemplate} onClick={updateTemplate}>更新规则模板</Button>
        <Button onClick={saveAsTemplate}>保存为新模板</Button>
        <Button type="primary" onClick={handleCreate}>生成广告计划</Button>
      </div>

      {lastTaskId && <div className="sf-batch-task-created">任务已创建：{lastTaskId}，状态为“创建中”，可前往任务管理查看账号级结果。</div>}

      <Modal title="选择预选跳转资源" open={resourcePickerOpen} width={860} centered onCancel={() => setResourcePickerOpen(false)} onOk={confirmResourcePicker} okText="确定" cancelText="取消">
        <div className="sf-batch-picker-tabs"><button className={resourcePickerKind === 'APP_DIRECT' ? 'active' : ''} type="button" onClick={() => { setResourcePickerKind('APP_DIRECT'); setResourcePickerSelection(draft.preselectedAppDirectId); }}>应用直达</button><button className={resourcePickerKind === 'LANDING_PAGE' ? 'active' : ''} type="button" onClick={() => { setResourcePickerKind('LANDING_PAGE'); setResourcePickerSelection(draft.preselectedLandingPageId); }}>官方落地页</button></div>
        <div className="sf-batch-resource-list">
          {resources.filter((resource) => resource.kind === resourcePickerKind).map((resource) => (
            <button className={resourcePickerSelection === resource.id ? 'sf-batch-resource-option selected' : 'sf-batch-resource-option'} key={resource.id} type="button" onClick={() => setResourcePickerSelection(resource.id)}>
              <span className="sf-batch-radio">{resourcePickerSelection === resource.id ? '✓' : ''}</span>
              <span><b>{resource.name}</b><small>{resource.monitoringLinkGroupId ? `监测链接组：${resource.monitoringLinkGroupId}` : resource.id} · {resource.url || '未配置应用直达链接'}</small><small>适用账号：{resource.accountIds.length} 个 · Android：{resource.androidAppId || '未配置'} · iOS：{resource.iosAppId || '未配置'}</small></span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal title="选择广告账号" open={accountPickerOpen} width={640} centered onCancel={() => setAccountPickerOpen(false)} onOk={confirmAccountPicker} okText="确定" cancelText="取消">
        <Checkbox.Group className="sf-batch-account-picker" value={accountPickerSelection} onChange={(values) => setAccountPickerSelection(values.map(String))}>
          {tencentBatchAccounts.map((account) => <Checkbox value={account.id} key={account.id}>{account.name}（{account.id}）</Checkbox>)}
        </Checkbox.Group>
      </Modal>

      <Modal title="身份认证" open={authOpen} width={520} centered onCancel={() => setAuthOpen(false)} footer={<Button type="primary" onClick={() => setAuthOpen(false)}>知道了</Button>}>
        <div className="sf-batch-auth-modal"><div className="sf-batch-auth-status">✓</div><b>本地 Mock 身份认证已通过</b><span>当前页面使用本地演示数据，不会发起真实授权或广告平台写入。</span></div>
      </Modal>

      <Modal title="配置落地页" open={assignmentOpen} width={1320} centered onCancel={() => setAssignmentOpen(false)} footer={[<Button key="cancel" onClick={() => setAssignmentOpen(false)}>取消</Button>, <Button key="ok" type="primary" onClick={confirmAssignments}>确定</Button>]}>
        <div className="sf-batch-landing-modal">
          <div className="sf-batch-landing-rule-row">
            <span className="sf-batch-landing-rule-label">配置规则</span>
            <div className="sf-batch-landing-rule-tabs">
              {tencentLandingConfigRules.map((rule) => (
                <button className={landingConfigRule === rule.value ? 'active' : ''} type="button" key={rule.value} onClick={() => setLandingConfigRule(rule.value)}>{rule.label}</button>
              ))}
            </div>
          </div>
          <div className="sf-batch-landing-count-row">
            <label><span>*</span>创意包含落地页数</label>
            <InputNumber min={1} max={3} value={landingPageCount} onChange={(value) => setLandingPageCount(value || 1)} />
            <span>最多支持3个落地页，请按实际需要填写，否则会报错</span>
          </div>
          <div className="sf-batch-landing-workspace">
            <div className="sf-batch-landing-ad-list">
              {selectedAccounts.map((account) => (
                <div className="sf-batch-landing-ad-item" key={account.id}>
                  <b>{draft.adName || '广告计划'}</b>
                  <span>ID：{account.id}</span>
                </div>
              ))}
            </div>
            <div className="sf-batch-landing-main">
              <div className="sf-batch-landing-jump-row">
                <span>跳转类型（落地页）</span>
                <div className="sf-batch-landing-jump-tabs">
                  <button type="button" disabled>Android 默认下载页</button>
                  <button type="button" disabled>跳转厂商商店</button>
                  <button className={landingConfigKind === 'APP_DIRECT' ? 'active' : ''} type="button" onClick={() => { setLandingConfigKind('APP_DIRECT'); setLandingResourceSelection(draft.preselectedAppDirectId ? [draft.preselectedAppDirectId] : []); }}>应用直达</button>
                  <button className={landingConfigKind === 'LANDING_PAGE' ? 'active' : ''} type="button" onClick={() => { setLandingConfigKind('LANDING_PAGE'); setLandingResourceSelection(draft.preselectedLandingPageId ? [draft.preselectedLandingPageId] : []); }}>官方落地页</button>
                  <button type="button" disabled>一键下载</button>
                </div>
              </div>
              <div className="sf-batch-landing-ad-count"><span>广告和创意数</span><b>广告数：{draft.accountIds.length}，创意数：{draft.materialGroupCount}</b></div>
              <div className="sf-batch-landing-actions">
                <Button type="primary" onClick={oneClickAssign}>按账户自动匹配</Button>
                <span>{assignmentNotice || `已匹配账号：${Object.values(assignmentDraft).filter((item) => item.resourceIds.length).length}/${draft.accountIds.length}`}</span>
              </div>
              <div className="sf-batch-landing-selection-toolbar">
                <Input placeholder="请输入搜索内容" prefix={<SearchOutlined />} value={landingConfigSearch} onChange={(event) => setLandingConfigSearch(event.target.value)} />
                <div className={landingResourceSelection.length > landingPageCount ? 'is-over-limit' : ''}>已选{landingConfigKind === 'APP_DIRECT' ? '应用直达' : '落地页'}：{landingResourceSelection.length}/{landingPageCount}<button type="button" onClick={() => setLandingResourceSelection([])}>清空选中</button></div>
              </div>
              <div className="sf-batch-landing-selection-grid">
                <div className="sf-batch-landing-resource-table">
                <div className="sf-batch-landing-table-head"><Checkbox /> <span>{landingConfigKind === 'APP_DIRECT' ? '监测链接组' : '名称'}</span><span>ID</span></div>
                  {landingConfigResources.map((resource) => (
                    <label className="sf-batch-landing-resource-row" key={resource.id}>
                      <Checkbox checked={landingResourceSelection.includes(resource.id)} onChange={() => setLandingResourceSelection((previous) => previous.includes(resource.id) ? previous.filter((id) => id !== resource.id) : [...previous, resource.id])} />
                      <span><b>{resource.name}</b><small>{resource.kind === 'APP_DIRECT' ? `直达：${resource.url || '-'} · Android：${resource.androidAppId || '-'} · iOS：${resource.iosAppId || '-'} · 通用：${resource.universalUrl || '-'} · 兜底：${resource.fallbackLandingPageName || '-'}` : resource.url}</small></span><span>{resource.monitoringLinkGroupId || resource.id}</span>
                    </label>
                  ))}
                </div>
                <div className="sf-batch-landing-selected-table">
                <div className="sf-batch-landing-table-head"><Checkbox /> <span>{landingConfigKind === 'APP_DIRECT' ? '监测链接组' : '名称'}</span><span>ID</span><span>操作</span></div>
                  {landingSelectedResources.map((resource) => (
                    <div className="sf-batch-landing-resource-row" key={resource.id}>
                      <Checkbox checked disabled />
                      <span><b>{resource.name}</b><small>{resource.kind === 'APP_DIRECT' ? `直达：${resource.url || '-'} · Android：${resource.androidAppId || '-'} · iOS：${resource.iosAppId || '-'} · 通用：${resource.universalUrl || '-'} · 兜底：${resource.fallbackLandingPageName || '-'}` : resource.url}</small></span><span>{resource.monitoringLinkGroupId || resource.id}</span><button type="button" onClick={() => setLandingResourceSelection((previous) => previous.filter((id) => id !== resource.id))}>删除</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sf-batch-landing-hint">应用直达直接选择监测链接组并预览 Android、iOS、通用链接和兜底页字段；自动匹配按账号范围执行，已有账号配置不覆盖。字段不完整只做 Mock 任务提示。</div>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default function SmallFighterPlan() {
  const [pageView, setPageView] = useState<PageView>(() => {
    if (window.location.hash === '#task') return 'task';
    if (window.location.hash === '#tencent-batch-create') return 'tencentBatchCreate';
    if (window.location.hash === '#monitoring-links') return 'monitoringLinks';
    return 'promotion';
  });
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
  const [monitoringLinkGroups, setMonitoringLinkGroups] = useState<TencentMonitoringLinkGroup[]>(initialTencentMonitoringLinkGroups);
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [taskOperationFilter, setTaskOperationFilter] = useState<TaskOperationType | 'all'>('all');
  const [taskKeyword, setTaskKeyword] = useState('');
  const [selectedTask, setSelectedTask] = useState<AsyncTaskRecord | null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskDetailFailedOnly, setTaskDetailFailedOnly] = useState(false);
  const [taskDetailKeyword, setTaskDetailKeyword] = useState('');
  const [taskDetailPage, setTaskDetailPage] = useState(1);
  const [tencentBatchOpen, setTencentBatchOpen] = useState(false);
  const [tencentCarrierType, setTencentCarrierType] = useState<TencentMarketingCarrierType>('MARKETING_CARRIER_TYPE_JUMP_PAGE');
  const [tencentAppId, setTencentAppId] = useState('');
  const [tencentOptimizationGoal, setTencentOptimizationGoal] = useState<TencentOptimizationGoal | undefined>(
    'OPTIMIZATIONGOAL_PROMOTION_VIEW_KEY_PAGE',
  );
  const [tencentPlatformChannelAssetId, setTencentPlatformChannelAssetId] = useState('9001024');
  const [tencentTemplate, setTencentTemplate] = useState<TencentBatchTemplate | null>(null);
  const [tencentLatestPreview, setTencentLatestPreview] = useState<TencentBatchPreview | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#task') {
        setPageView('task');
      } else if (window.location.hash === '#tencent-batch-create') {
        setPageView('tencentBatchCreate');
        setTaskDrawerOpen(false);
        setSelectedTask(null);
      } else if (window.location.hash === '#monitoring-links') {
        setPageView('monitoringLinks');
        setTaskDrawerOpen(false);
        setSelectedTask(null);
      } else {
        setPageView('promotion');
        setTaskDrawerOpen(false);
        setSelectedTask(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
  const tencentIsAppCarrier = isTencentAppCarrier(tencentCarrierType);
  const tencentAppIdRequiredButEmpty = tencentIsAppCarrier && !tencentAppId.trim();
  const tencentOptimizationOptions = useMemo(() => getTencentOptimizationOptions(tencentCarrierType), [tencentCarrierType]);
  const tencentPreviewPayload = useMemo(
    () =>
      buildTencentBatchPreview({
        carrierType: tencentCarrierType,
        appId: tencentAppId,
        optimizationGoal: tencentOptimizationGoal,
        platformChannelAssetId: tencentPlatformChannelAssetId,
      }),
    [tencentAppId, tencentCarrierType, tencentOptimizationGoal, tencentPlatformChannelAssetId],
  );

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

  const tencentResources = useMemo(() => {
    const groupMap = new Map(monitoringLinkGroups.map((group) => [group.id, group]));
    const baseResources = tencentBatchResources.map((resource) => {
      const group = groupMap.get(resource.monitoringLinkGroupId || resource.id);
      if (!group) return resource;
      const groupResource = monitoringLinkGroupToResource(group);
      return {
        ...resource,
        ...groupResource,
        id: resource.id,
        accountIds: resource.accountIds.length > 0 ? resource.accountIds : groupResource.accountIds,
        monitoringLinkGroupId: group.id,
        monitoringLinkGroup: group,
      };
    });
    const baseIds = new Set(baseResources.map((resource) => resource.id));
    return [
      ...baseResources,
      ...monitoringLinkGroups.filter((group) => !baseIds.has(group.id)).map(monitoringLinkGroupToResource),
    ];
  }, [monitoringLinkGroups]);

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

  const openTencentBatchPage = () => {
    window.location.hash = 'tencent-batch-create';
    setPageView('tencentBatchCreate');
  };

  const openMonitoringLinksPage = () => {
    window.location.hash = 'monitoring-links';
    setPageView('monitoringLinks');
    setTaskDrawerOpen(false);
    setSelectedTask(null);
  };

  const openPromotionPage = () => {
    window.location.hash = '';
    setPageView('promotion');
    setTaskDrawerOpen(false);
    setSelectedTask(null);
  };

  const appendTencentBatchTask = (task: AsyncTaskRecord) => {
    setTaskRecords((previous) => [task, ...previous]);
  };

  const appendMonitoringLinkGroups = (groupsToAdd: TencentMonitoringLinkGroup[]) => {
    setMonitoringLinkGroups((previous) => [...groupsToAdd, ...previous]);
  };

  const saveMonitoringLinkGroup = (group: TencentMonitoringLinkGroup) => {
    setMonitoringLinkGroups((previous) => {
      const exists = previous.some((item) => item.id === group.id);
      return exists ? previous.map((item) => item.id === group.id ? group : item) : [group, ...previous];
    });
  };

  const deleteMonitoringLinkGroup = (groupId: string) => {
    setMonitoringLinkGroups((previous) => previous.filter((group) => group.id !== groupId));
  };

  const openTaskDetail = (task: AsyncTaskRecord) => {
    setSelectedTask(task);
    setTaskDetailFailedOnly(false);
    setTaskDetailKeyword('');
    setTaskDetailPage(1);
    setTaskDrawerOpen(true);
  };

  const handleTencentCarrierChange = (carrierType: TencentMarketingCarrierType) => {
    setTencentCarrierType(carrierType);
    setTencentOptimizationGoal(undefined);
    setTencentLatestPreview(null);
    if (carrierType === 'MARKETING_CARRIER_TYPE_JUMP_PAGE') {
      setTencentAppId('');
    }
  };

  const handleTencentAppIdChange = (value: string) => {
    setTencentAppId(value);
    setTencentOptimizationGoal(undefined);
    setTencentLatestPreview(null);
  };

  const handleSaveTencentTemplate = () => {
    setTencentTemplate({
      carrierType: tencentCarrierType,
      appId: tencentAppId,
      optimizationGoal: tencentOptimizationGoal,
      platformChannelAssetId: tencentPlatformChannelAssetId,
    });
    message.success('规则模板已保存');
  };

  const handleApplyTencentTemplate = () => {
    if (!tencentTemplate) {
      message.warning('暂无可引用的规则模板');
      return;
    }
    setTencentCarrierType(tencentTemplate.carrierType);
    setTencentAppId(tencentTemplate.appId);
    setTencentOptimizationGoal(tencentTemplate.optimizationGoal);
    setTencentPlatformChannelAssetId(tencentTemplate.platformChannelAssetId);
    setTencentLatestPreview(null);
    message.success('已引用规则模板');
  };

  const handleGenerateTencentBatch = () => {
    if (!tencentPlatformChannelAssetId.trim()) {
      message.warning('请选择或输入平台频道产品 ID');
      return;
    }
    if (tencentAppIdRequiredButEmpty) {
      message.warning(`请先输入${getTencentAppIdLabel(tencentCarrierType)}，再生成广告计划`);
      return;
    }
    if (!tencentOptimizationGoal) {
      message.warning('请选择转化/优化目标');
      return;
    }

    const preview = buildTencentBatchPreview({
      carrierType: tencentCarrierType,
      appId: tencentAppId,
      optimizationGoal: tencentOptimizationGoal,
      platformChannelAssetId: tencentPlatformChannelAssetId,
    });
    const taskId = `TX-BATCH-${Date.now().toString().slice(-8)}`;

    setTencentLatestPreview(preview);
    setTaskRecords((prev) => [
      createTaskRecord({
        taskId,
        operationType: '批量创建腾讯广告',
        affectedCount: 24,
        operator: operatorName,
        filterSnapshot: [
          { label: '媒体', value: '腾讯广告' },
          { label: '营销目的', value: '用户增长' },
          { label: '推广产品', value: '平台频道' },
          { label: '营销载体', value: getTencentCarrierLabel(tencentCarrierType) },
          { label: '应用ID', value: tencentIsAppCarrier ? tencentAppId.trim() : '-' },
          { label: '转化目标', value: tencentOptimizationGoal },
        ],
        paramsSummary: `平台频道 / ${getTencentCarrierLabel(tencentCarrierType)} / ${tencentOptimizationGoal}`,
        media: '腾讯广告',
        level: '单元',
      }),
      ...prev,
    ]);
    message.success('腾讯广告批量创建任务已生成');
  };

  const focusFailedDetails = () => {
    setTaskDetailFailedOnly(true);
    setTaskDetailPage(1);
    window.setTimeout(() => {
      document.querySelector('.sf-task-result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleRetryFailedDetails = () => {
    if (!selectedTask || selectedTask.failedCount === 0) {
      message.warning('当前任务没有可重试的失败项');
      return;
    }
    setTaskDetailFailedOnly(true);
    setTaskDetailPage(1);
    message.success(`已创建 ${selectedTask.failedCount.toLocaleString()} 条失败项的批量重试任务`);
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
      title: '跳转类型',
      dataIndex: 'jumpType',
      width: 130,
      render: (value?: string) => value || '-',
    },
    {
      title: '资源',
      dataIndex: 'resourceName',
      width: 180,
      ellipsis: true,
      render: (value: string | undefined, record: TaskDetailRow) => value ? `${value}${record.resourceId ? `（${record.resourceId}）` : ''}` : '-',
    },
    {
      title: '配置提示',
      dataIndex: 'configWarning',
      width: 220,
      render: (value?: string) => value ? <span className="sf-task-config-warning">{value}</span> : '-',
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
    <div className={pageView === 'tencentBatchCreate' || pageView === 'monitoringLinks' ? 'sf-portal-page sf-portal-page--batch' : 'sf-portal-page'}>
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
          {pageView === 'tencentBatchCreate' || pageView === 'monitoringLinks' ? (
            <>
              <Button type="text" className="sf-legacy-top-pill">◈ 反馈</Button>
              <Button type="text" className="sf-legacy-top-pill">▣ 教程</Button>
              <span className="sf-top-divider" />
              <Button type="text" icon={<CloudDownloadOutlined />} onClick={openTaskPage} />
              <Button type="text" icon={<BellOutlined />} />
              <span className="sf-top-divider" />
            </>
          ) : (
            <>
              <Button type="text" className="sf-back-link">返回上一级</Button>
              <span className="sf-top-divider" />
              <Button type="text" icon={<QrcodeOutlined />} />
              <Button type="text" icon={<AppstoreOutlined />} />
              <Button type="text" icon={<CloudDownloadOutlined />} onClick={openTaskPage} />
            </>
          )}
          <span className="sf-avatar">Z</span>
          <span className="sf-user">zhitou@sunteng...</span>
          <DownOutlined className="sf-user-arrow" />
        </div>
      </header>

      <div className="sf-body">
        {pageView === 'tencentBatchCreate' || pageView === 'monitoringLinks' ? (
          <TencentBatchLegacySidebar activeItem={pageView === 'monitoringLinks' ? '监测链接' : undefined} onMonitoringLinks={openMonitoringLinksPage} />
        ) : (
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
        )}

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
                <Button className="sf-tencent-create-btn" type="primary" onClick={openTencentBatchPage}>
                  腾讯广告批量创建
                </Button>
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
          ) : pageView === 'task' ? (
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
          ) : pageView === 'monitoringLinks' ? (
            <TencentMonitoringLinkManagementPage
              groups={monitoringLinkGroups}
              onImportGroups={appendMonitoringLinkGroups}
              onSaveGroup={saveMonitoringLinkGroup}
              onDeleteGroup={deleteMonitoringLinkGroup}
            />
          ) : (
            <TencentBatchCreatePage resources={tencentResources} onBack={openPromotionPage} onCreateTask={appendTencentBatchTask} />
          )}
        </main>
      </div>

      <Modal
        title="腾讯广告批量创建"
        open={tencentBatchOpen}
        onCancel={() => setTencentBatchOpen(false)}
        width={1040}
        centered
        className="sf-tencent-batch-modal"
        footer={[
          <Button key="template" onClick={handleApplyTencentTemplate}>引用规则模板</Button>,
          <Button key="save" onClick={handleSaveTencentTemplate}>保存为规则模板</Button>,
          <Button
            key="ok"
            type="primary"
            disabled={tencentAppIdRequiredButEmpty || !tencentOptimizationGoal || !tencentPlatformChannelAssetId.trim()}
            onClick={handleGenerateTencentBatch}
          >
            生成广告计划
          </Button>,
        ]}
      >
        <div className="sf-tencent-flow">
          <section className="sf-tencent-card sf-tencent-card--content">
            <div className="sf-tencent-card-head">
              <div>
                <h3>营销内容</h3>
                <span>用户增长 / 平台频道链路</span>
              </div>
              <b>基础 v3.0 字段</b>
            </div>

            <div className="sf-tencent-purpose-grid">
              {['商品销售', '品牌宣传', '加粉互动', '线索留资', '用户增长'].map((item) => (
                <button className={item === '用户增长' ? 'active' : ''} key={item} type="button">
                  {item}
                </button>
              ))}
            </div>

            <div className="sf-tencent-field">
              <label>推广产品</label>
              <div className="sf-tencent-chip-row">
                {['Android 应用', 'iOS 应用', '微信小程序', '平台频道', '视频号直播'].map((item) => (
                  <span className={item === '平台频道' ? 'active' : ''} key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="sf-tencent-field sf-tencent-product-field">
              <label>平台频道产品 ID</label>
              <Input
                value={tencentPlatformChannelAssetId}
                onChange={(event) => {
                  setTencentPlatformChannelAssetId(event.target.value);
                  setTencentLatestPreview(null);
                }}
                placeholder="请选择或输入平台频道产品 ID"
              />
            </div>

            <div className="sf-tencent-field">
              <label>营销载体</label>
              <div className="sf-tencent-carrier-tabs">
                {tencentCarrierOptions.map((item) => (
                  <button
                    className={tencentCarrierType === item.value ? 'active' : ''}
                    key={item.value}
                    type="button"
                    onClick={() => handleTencentCarrierChange(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {tencentIsAppCarrier && (
              <div className="sf-tencent-field sf-tencent-product-field">
                <label>{getTencentAppIdLabel(tencentCarrierType)}</label>
                <Input
                  status={tencentAppIdRequiredButEmpty ? 'warning' : undefined}
                  value={tencentAppId}
                  onChange={(event) => handleTencentAppIdChange(event.target.value)}
                  placeholder={`请输入推广的 ${getTencentAppIdLabel(tencentCarrierType)}`}
                />
                {tencentAppIdRequiredButEmpty && (
                  <div className="sf-tencent-warning">
                    请先输入{getTencentAppIdLabel(tencentCarrierType)}，再选择转化
                  </div>
                )}
              </div>
            )}

            <div className="sf-tencent-field sf-tencent-product-field">
              <label>转化/优化目标</label>
              <Select
                value={tencentOptimizationGoal}
                disabled={tencentAppIdRequiredButEmpty}
                placeholder={tencentAppIdRequiredButEmpty ? `请先输入${getTencentAppIdLabel(tencentCarrierType)}` : '请选择转化'}
                suffixIcon={<DownOutlined />}
                options={tencentOptimizationOptions}
                onChange={(value) => {
                  setTencentOptimizationGoal(value);
                  setTencentLatestPreview(null);
                }}
              />
              <div className="sf-tencent-hint">
                查询 optimization_goal_permissions/get 时会带上当前营销载体；Android/iOS 会额外携带 App ID。
              </div>
            </div>
          </section>

          <section className="sf-tencent-card">
            <div className="sf-tencent-card-head">
              <div>
                <h3>生成字段预览</h3>
                <span>营销单元与创意主跳转</span>
              </div>
              <b>{getTencentCarrierLabel(tencentCarrierType)}</b>
            </div>

            <div className="sf-tencent-diff-grid">
              <div>
                <span>marketing_goal</span>
                <b>MARKETING_GOAL_USER_GROWTH</b>
              </div>
              <div>
                <span>marketing_target_type</span>
                <b>MARKETING_TARGET_TYPE_PLATFORM_CHANNEL</b>
              </div>
              <div>
                <span>marketing_carrier_type</span>
                <b>{tencentCarrierType}</b>
              </div>
              <div>
                <span>marketing_carrier_detail</span>
                <b>{tencentIsAppCarrier ? `marketing_carrier_id=${tencentAppId.trim() || '--'}` : '不传'}</b>
              </div>
              <div>
                <span>main_jump_info.page_type</span>
                <b>{tencentPreviewPayload.dynamic_creative_request.main_jump_info[0].value.page_type}</b>
              </div>
              <div>
                <span>targeting.user_os</span>
                <b>{tencentPreviewPayload.adgroup_request.targeting?.user_os.join(', ') || '不锁定'}</b>
              </div>
            </div>

            <pre className="sf-tencent-json">{JSON.stringify(tencentLatestPreview || tencentPreviewPayload, null, 2)}</pre>
          </section>
        </div>
      </Modal>

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
                <div className="sf-task-result-actions">
                  <Checkbox
                    checked={taskDetailFailedOnly}
                    onChange={(event) => {
                      setTaskDetailFailedOnly(event.target.checked);
                      setTaskDetailPage(1);
                    }}
                  >
                    只查看失败任务
                  </Checkbox>
                  <Button
                    size="small"
                    type="primary"
                    disabled={selectedTask.failedCount === 0}
                    onClick={handleRetryFailedDetails}
                  >
                    批量重试失败项
                  </Button>
                </div>
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
