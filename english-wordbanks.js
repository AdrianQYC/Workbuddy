const ieltsToeflCore = [
  ["deficit", "/ˈdefɪsɪt/", "赤字；不足", "The city faced a budget deficit after the project expanded."],
  ["equilibrium", "/ˌiːkwɪˈlɪbriəm/", "平衡；均衡", "The ecosystem returned to equilibrium after several years."],
  ["proliferation", "/prəˌlɪfəˈreɪʃn/", "扩散；激增", "The proliferation of devices changed classroom learning."],
  ["corroborate", "/kəˈrɒbəreɪt/", "证实；确认", "The second survey helped corroborate the original finding."],
  ["apathy", "/ˈæpəθi/", "冷漠；缺乏兴趣", "Public apathy made the campaign less effective."],
  ["culmination", "/ˌkʌlmɪˈneɪʃn/", "高潮；最终结果", "The exhibition was the culmination of years of research."],
  ["futile", "/ˈfjuːtaɪl/", "徒劳的；无效的", "It was futile to continue without reliable evidence."],
  ["engender", "/ɪnˈdʒendə(r)/", "引起；造成", "The policy may engender trust among local residents."],
  ["disparate", "/ˈdɪspərət/", "迥然不同的", "The study combines data from disparate sources."],
  ["rejuvenate", "/rɪˈdʒuːvəneɪt/", "使恢复活力", "New investment could rejuvenate the old industrial area."],
  ["belligerent", "/bəˈlɪdʒərənt/", "好战的；敌对的", "The negotiators avoided belligerent language."],
  ["oscillation", "/ˌɒsɪˈleɪʃn/", "振动；波动", "Temperature oscillation can damage sensitive equipment."],
  ["eradicate", "/ɪˈrædɪkeɪt/", "根除；消灭", "The program aims to eradicate the disease."],
  ["meticulous", "/məˈtɪkjələs/", "细致的；一丝不苟的", "The researcher kept meticulous records."],
  ["impetus", "/ˈɪmpɪtəs/", "推动力；刺激", "The discovery gave new impetus to the project."],
  ["sovereign", "/ˈsɒvrɪn/", "主权的；最高的", "The treaty recognized the state as sovereign."],
  ["nomenclature", "/nəˈmenklətʃə(r)/", "命名法；术语体系", "Scientific nomenclature helps avoid confusion."],
  ["empirical", "/ɪmˈpɪrɪkl/", "实证的；经验的", "The claim requires empirical support."],
  ["ostentatious", "/ˌɒstenˈteɪʃəs/", "炫耀的；卖弄的", "The building was criticized for its ostentatious design."],
  ["perpetrate", "/ˈpɜːpətreɪt/", "犯；实施", "The report described how the fraud was perpetrated."],
  ["prolific", "/prəˈlɪfɪk/", "多产的；丰富的", "She became a prolific writer in her later years."],
  ["obviate", "/ˈɒbvieɪt/", "排除；避免", "Careful planning can obviate many risks."],
  ["detrimental", "/ˌdetrɪˈmentl/", "有害的；不利的", "Noise pollution is detrimental to sleep quality."],
  ["supersede", "/ˌsuːpəˈsiːd/", "取代；替代", "The new model will supersede the old system."],
  ["versatility", "/ˌvɜːsəˈtɪləti/", "多功能性；适应性", "The material is valued for its versatility."],
  ["pervade", "/pəˈveɪd/", "弥漫；遍及", "A sense of uncertainty pervaded the discussion."],
  ["regression", "/rɪˈɡreʃn/", "回归；退化", "The data were analyzed using regression."],
  ["aberration", "/ˌæbəˈreɪʃn/", "异常；偏差", "The sudden result was treated as an aberration."],
  ["intrinsic", "/ɪnˈtrɪnzɪk/", "内在的；固有的", "The object has intrinsic historical value."],
  ["disseminate", "/dɪˈsemɪneɪt/", "传播；散布", "The team will disseminate the results online."],
  ["statutory", "/ˈstætʃətri/", "法定的", "Employers must meet statutory safety requirements."],
  ["postulate", "/ˈpɒstjuleɪt/", "假定；假设", "The theory postulates a link between stress and memory."],
  ["expedite", "/ˈekspədaɪt/", "加快；促进", "Digital forms can expedite the application process."],
  ["stagnation", "/stæɡˈneɪʃn/", "停滞", "Economic stagnation affected employment."],
  ["feasibility", "/ˌfiːzəˈbɪləti/", "可行性", "The report evaluates the feasibility of the plan."],
  ["intractable", "/ɪnˈtræktəbl/", "棘手的；难处理的", "The conflict became increasingly intractable."],
  ["supplant", "/səˈplɑːnt/", "取代", "Online media began to supplant printed newspapers."],
  ["conjecture", "/kənˈdʒektʃə(r)/", "推测；猜想", "The argument is based largely on conjecture."],
  ["coalesce", "/ˌkəʊəˈles/", "合并；联合", "Several small groups coalesced into one organization."],
  ["amenable", "/əˈmiːnəbl/", "愿意合作的；可处理的", "The problem is amenable to statistical analysis."],
];

const coreExampleCn = {
  deficit: "项目扩大后，这座城市面临预算赤字。",
  equilibrium: "几年后，生态系统恢复了平衡。",
  proliferation: "设备的激增改变了课堂学习。",
  corroborate: "第二次调查帮助证实了最初的发现。",
  apathy: "公众的冷漠使这场宣传活动效果变差。",
  culmination: "这次展览是多年研究的最终成果。",
  futile: "没有可靠证据，继续下去是徒劳的。",
  engender: "这项政策可能会在当地居民中建立信任。",
  disparate: "这项研究整合了来自不同来源的数据。",
  rejuvenate: "新的投资可能使这个老工业区恢复活力。",
  belligerent: "谈判人员避免使用敌对语言。",
  oscillation: "温度波动会损坏敏感设备。",
  eradicate: "这个项目旨在根除这种疾病。",
  meticulous: "研究人员保存了细致的记录。",
  impetus: "这一发现给项目带来了新的推动力。",
  sovereign: "该条约承认这个国家拥有主权地位。",
  nomenclature: "科学命名法有助于避免混淆。",
  empirical: "这个说法需要实证支持。",
  ostentatious: "这座建筑因设计过于炫耀而受到批评。",
  perpetrate: "报告描述了这起欺诈是如何实施的。",
  prolific: "她晚年成为一位多产作家。",
  obviate: "周密规划可以避免许多风险。",
  detrimental: "噪音污染对睡眠质量有害。",
  supersede: "新型号将取代旧系统。",
  versatility: "这种材料因其多功能性而受到重视。",
  pervade: "一种不确定感弥漫在讨论中。",
  regression: "这些数据用回归方法进行了分析。",
  aberration: "这个突然出现的结果被视为异常。",
  intrinsic: "这件物品具有内在的历史价值。",
  disseminate: "团队将在网上传播这些结果。",
  statutory: "雇主必须满足法定安全要求。",
  postulate: "该理论假设压力和记忆之间存在联系。",
  expedite: "电子表格可以加快申请流程。",
  stagnation: "经济停滞影响了就业。",
  feasibility: "报告评估了该计划的可行性。",
  intractable: "这场冲突变得越来越棘手。",
  supplant: "网络媒体开始取代纸质报纸。",
  conjecture: "这个论点主要基于推测。",
  coalesce: "几个小团体合并成了一个组织。",
  amenable: "这个问题适合用统计方法分析。",
};

const academicExtraRaw = `
acidification|酸化
actuate|驱动；促使
adaptation|适应；改编
adverse|不利的
advocate|提倡；倡导者
aggregate|总计；集合
allocate|分配
ambiguous|模棱两可的
amplification|扩大；增强
analogous|类似的
anomalous|异常的
appendage|附属物
arbitrary|任意的；武断的
ascendancy|优势；支配地位
assimilate|吸收；同化
attain|达到；获得
attribute|属性；归因于
autonomous|自治的；自主的
calorific|热量的
coherent|连贯的
coincide|同时发生；一致
compensate|补偿
concurrent|同时发生的
conducive|有助于的
congenital|先天的
conjointly|共同地
conservation|保护；保存
constraint|限制
contaminate|污染
controversial|有争议的
conventional|传统的；常规的
correlate|相关联
criteria|标准
decisive|决定性的
deciduous|落叶的
deduce|推断
degradation|退化；降解
demographic|人口统计的
demobilize|遣散；复员
denote|表示；指代
deplete|耗尽
derive|获得；源自
desalination|脱盐
deterrent|威慑物
deviation|偏离
diminish|减少
discrete|离散的；分离的
displace|取代；使迁移
dormancy|休眠
ecological|生态的
elicit|引出；诱出
eliminate|消除
emergence|出现
encompass|包含；围绕
ensue|接着发生
enshroud|笼罩
equivalent|等同的；相当的
erode|侵蚀
erratic|不规律的
ethic|伦理；道德准则
evidence|证据
evolutionary|进化的
exacerbate|加剧
excavate|挖掘
exemplify|例证
exert|施加
exhaustive|详尽的
explicit|明确的
facilitate|促进；使便利
fluctuation|波动
formulate|制定；构想
fragmentation|碎片化
germicide|杀菌剂
hectare|公顷
herbivorous|食草的
hypothesis|假设
ideology|意识形态
implementation|实施
implicit|含蓄的
incentive|激励
incompatible|不兼容的
inevitable|不可避免的
inference|推论
infrastructure|基础设施
inhibit|抑制
inherent|固有的
inert|惰性的；无活力的
inquiry|调查；询问
insight|洞察
integral|不可或缺的
intensive|密集的
intermediate|中间的
intervention|干预
inundate|淹没；使不胜负荷
irreducible|不可简化的
irreversible|不可逆的
isolate|隔离
legislation|立法
levy|征收；税款
manipulate|操纵；处理
methodology|方法论
minimal|最小的
mobilize|动员
modification|修改
monetary|货币的
mutual|相互的
notwithstanding|尽管
objective|客观的；目标
obscure|模糊的；遮掩
occupational|职业的
offset|抵消
ongoing|持续的
paradigm|范式
parameter|参数
perceive|感知；理解
persistent|持续的
phenomenon|现象
plausible|貌似合理的
posterity|后代
pragmatic|务实的
precarious|不稳定的
precede|先于
preconceive|预先形成
preliminary|初步的
prehensile|能抓握的
preposterous|荒谬的
presume|假定
prevail|盛行；获胜
principal|主要的
profound|深刻的
prohibit|禁止
proportion|比例
prospective|预期的；未来的
protocol|协议；规程
qualitative|定性的
quantitative|定量的
rational|理性的
reconnaissance|侦察；勘察
refine|改进；提炼
regulate|调节；管理
reinforce|加强
reliable|可靠的
residual|残余的
resolve|解决；决心
revenue|收入
reverberate|回响；产生深远影响
salinity|盐度
scenario|情境；方案
secession|脱离；分离
simulate|模拟
so-called|所谓的
specify|明确说明
spontaneous|自发的
stabilize|稳定
subordinate|从属的
subsequent|随后的
subversive|颠覆性的
suffrage|选举权
supplement|补充
sustainable|可持续的
telepathic|心灵感应的
terminate|终止
transmission|传播；传输
transparent|透明的
undergo|经历
underlie|构成基础
undertake|承担；从事
urbanity|文雅；都市性
utilize|利用
validity|有效性
variable|变量；可变的
vertebrate|脊椎动物
viable|可行的；能存活的
vulnerable|脆弱的
widespread|广泛的
`;

function buildExtraWords() {
  return academicExtraRaw
    .trim()
    .split("\n")
    .map((line, index) => {
      const [word, translation] = line.split("|");
      return {
        id: `ielts-toefl-extra-${index + 1}`,
        word,
        phonetic: "",
        translation,
        example: `Academic reading often uses "${word}" in formal contexts.`,
        exampleCn: `学术阅读中常在正式语境里使用 ${word} 这个词。`,
        tags: ["雅思托福", "学术"],
      };
    });
}

export const englishWordBanks = [
  {
    id: "ielts-toefl",
    name: "雅思托福",
    description: "试用词库，先放一批学术阅读常见词，后续可继续替换或扩展。",
    words: [
      ...ieltsToeflCore.map(([word, phonetic, translation, example], index) => ({
        id: `ielts-toefl-core-${index + 1}`,
        word,
        phonetic,
        translation,
        example,
        exampleCn: coreExampleCn[word] || "",
        tags: ["雅思托福", "核心"],
      })),
      ...buildExtraWords(),
    ],
  },
  {
    id: "postgraduate",
    name: "考研英语",
    description: "词库空壳，等确认来源后再接入。",
    words: [],
  },
  {
    id: "professional",
    name: "专业英语",
    description: "词库空壳，后续可按你的专业方向单独维护。",
    words: [],
  },
];
