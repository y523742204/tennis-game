// 游戏调参入口。修改后刷新页面；线上版本需重新部署。
// 单位：距离为米，时间为秒（带 Ms 的字段为毫秒），角度为弧度。
// 推荐先调整 stamina / movement / shot；物理、场地、动画参数应配合测试修改。
export const CONFIG={
  stamina:{
    full:100, // 初始体力、每局重置值、体力条固定总刻度
    recoveryPerSecond:2, // 回合内每真实秒恢复量；暂停与分间不计时
    capRetention:.9, // 本分首次耗尽后，下分上限保留比例，0.9 即降低 10%
    runCostPerMeter:2.2, // 每移动一米消耗的体力
    shotBaseCost:4, // 每次击球基础消耗
    shotPowerCost:.14, // 每一点力量额外消耗
    shotTypeCost:{flat:0,top:4,slice:2,volley:5,smash:10}, // 截击/高压额外消耗提高；发球不扣击球体力
    netRushCost:12, // 每次点击主动上网时立即扣除的体力（跑动距离仍正常耗体力）
    perfectCostMultiplier:.7, // Perfect 消耗倍率
    lowThreshold:30, // 低于此绝对体力值开始降低球速和稳定性
    minimumMoveMultiplier:.45, // 零体力时移动速度倍率
    maximumPaceLoss:.3, // 零体力最大球速系数损失（30%）
    stabilityThreshold:60, // 低于此体力开始降低稳定性；球速惩罚仍使用 lowThreshold
    maximumScatter:4.2, // 零体力落点偏移半径，米；允许出界
    scatterExponent:1.2, // 稳定性衰减曲线；越小，中低体力的偏移越明显
    displayFallRate:3.8, // 体力条下降追赶速度；越大越快
    displayRiseRate:2.8, // 体力条恢复追赶速度；越小越慢
    displayTrailRate:1.7, // 金色残影追赶速度
    displaySnap:.025, // 显示值与目标差小于此值时对齐
    lowColor:25, // 红色警戒阈值
    tiredColor:45, // 黄色警戒阈值
    trackColor:'#173a2bda', // 可用容量底色
    deadZoneColor:'#747a78', // 降低的容量：右侧灰色死区
  },
  movement:{
    netRushMultiplier:1.8,netRushDistance:10, // 主动上网冲刺速度倍率、最多加速距离（米）；仅向前移动生效
    humanSpeed:6.5, // 玩家满体力速度，米/模拟秒
    cpuSpeed:{easy:4.8,normal:6.8,hard:8.8}, // 三档电脑速度
    recoveryMultiplier:.84, // 击球后回位速度倍率
    recoveryDelay:.18, // 击球后开始回位的延迟
    arrivalTolerance:.025, // 判定到达移动目标的距离
  },
  shot:{
    speedKmh:{flat:120,top:115,slice:100,volley:95,smash:155}, // 满体力、基准力量下的出拍速度，km/h
    serveSpeedKmh:180, // 满体力、基准力量的平击发球出拍速度，km/h
    serveTopLossKmh:20, // 满上旋发球速度损失，km/h
    serveSideLossKmh:10, // 满侧旋发球速度损失，km/h
    minimumFlightTime:.12,maximumFlightTime:3, // 轨迹求解允许的时间范围，模拟秒
    neutralPower:65, // 默认力量，也是速度与落点纵向修正的基准
    powerSpeedFactor:.002, // 力量每高于基准一点的速度增益比例
    perfectSpeed:1.25, // Perfect 暴力击球倍率：标准发球约225、平击回球约150 km/h
    perfectDipSpin:220, // Perfect 平击/上旋回球附加上旋，rad/s；让高速球过网后快速下坠
    timingScatter:2.4, // 非 Perfect 的操作误差系数
    powerDepthOffset:.022, // 力量每偏离基准一点的纵向落点偏移
    solverPasses:5, // 轨迹落点迭代次数；越大越耗性能
    speedPasses:6, // 匹配指定出球速度的迭代次数
    netClearance:.01, // 球心过网的额外余量；短球/低球会自动降速抬高弧线
    netTop:1.05, // 物理球网顶部高度，与网碰撞体一致
    serveContactHeight:3.5, // 卡通球员伸臂发球的球心高度
    serveTargetDepth:6, // 默认发球目标纵深，接近发球线
    receiverDepth:12.4, // 接发站位纵深，基线附近
    aimLineMargin:.3, // 瞄准点距边线/发球线的余量
    landingHeight:.11, // 球落地时球心高度
    contactTolerance:.8, // 自动击球时角色到目标位置的最大距离
    backhandThreshold:-.1, // 相对来球横向位置的反手阈值
    flatFirstServeYaw:1.2, // 平击一发横向角度误差上限，度
    flatFirstServePitch:1.1, // 平击一发俯仰角度误差上限，度；在轨迹求解后施加，可能下网/出界
    serveErrorPowerFactor:.012, // 高于基准力量时每一点增加的误差倍率
    perfectServeErrorMultiplier:.35, // Perfect 降低一发误差，仍不保证进球
    flatServeSpinThreshold:.25, // 上旋量达到此值后不使用平击一发额外误差
    serveSpinErrorReduction:.5, // 侧旋对平击一发误差的最大减免比例
    netPaceThreshold:20,netPaceScatterPerSpeed:.035,netPaceScatterMax:1.25, // 截击/高压处理高速来球的额外落点波动
  },
  physics:{
    step:1/240, // 固定物理步长，秒
    timeScale:.62, // 发球整段飞行（含弹地后）的时间倍率
    rallyTimeScale:.52, // 回球时间倍率；低于发球值以留出选球时间，不改变测速结果
    maximumFrameTime:.05, // 单帧最大时间，避免切后台后跳变
    gravity:9.81, // 重力加速度
    ballMass:.057, // 网球质量，千克
    ballRadius:.17, // 网球显示和碰撞半径
    solverIterations:15, // 碰撞求解精度
    grassFriction:.4, // 草地摩擦
    grassRestitution:.78, // 草地反弹系数
    netFriction:.6, // 球网摩擦
    netRestitution:.1, // 球网反弹系数
    angularDamping:.2, // 旋转衰减
    drag:.00065, // 空气阻力系数
    magnus:.00006, // 旋转产生侧向力的系数
    topSpin:38, // 上旋角速度
    sliceSpin:-28, // 切削角速度
    serveTopSpin:64, // 发球最大上旋角速度
    serveSideSpin:170, // 发球最大侧旋角速度；增大可加强横向弯曲
  },
  input:{
    serveCancelTop:48, // 发球长按后拖入屏幕顶部取消区的高度（另加安全区），像素
    holdMs:260, // 长按触发时间
    chargeRate:.004, // 力量循环角速度，弧度/毫秒
    minimumPower:35, // 力量条最小值
    powerRange:60, // 力量条可增加范围；最大值=最小值+范围
    perfectCenter:.5, // Perfect 区中心（0~1）
    perfectHalfWidth:.075, // Perfect 区半宽
    shotDragThreshold:18, // 选球手势最小距离，像素
    serveDeadZone:.12, // 发球圆盘中心平击区半径比例
    keyboardSpinStep:.2, // 方向键每次调整旋转量
  },
  audio:{
    enabled:true, // 默认启用音效；用户可在比赛设置中关闭
    volume:.35, // 主音量（0~1），浏览器首次点击/按键后启用
    hitVolume:.65,bounceVolume:.32,netVolume:.25,pointVolume:.2, // 各类事件相对音量
    hitDuration:.095,perfectDuration:.16, // 击球/Perfect 击球声音长度，秒
    hitFrequency:190,serveFrequency:150,sliceFrequency:250,topFrequency:175, // 击球低音频率，Hz
    perfectFrequency:95,perfectChimeFrequency:880, // 暴力击球低音与明亮提示频率
    bounceFrequency:260,netFrequency:100, // 弹地/触网音色频率
    bounceCooldown:.08,netCooldown:.15, // 物理重复碰撞音效的最小间隔，秒
  },
  ai:{
    serveWait:1.2, // 电脑准备发球等待时间
    servePowerMin:55,servePowerRange:15, // 电脑发球力量范围
    serveSideRange:1.4, // 发球左右旋随机范围
    secondServeTop:.65,firstServeTopRange:.45, // 二发上旋、一发上旋范围
    serveXMin:1.4,serveXRange:1.8, // 发球目标横向距离及随机范围
    serveDepthMin:5.7,serveDepthRange:.4, // 发球目标纵深及随机范围，避免浅发球
    // 难度同时影响战术进攻幅度、空当识别阈值和执行误差；跑速仍在 movement 中配置。
    returnProfiles:{
      easy:{widthMargin:1.15,depthMargin:2.1,openThreshold:1.6,attackPower:62,controlPower:55,defensePower:42,scatter:.55,perfectSetup:.42,perfectChance:.25},
      normal:{widthMargin:.65,depthMargin:1.4,openThreshold:1.1,attackPower:74,controlPower:63,defensePower:48,scatter:.3,perfectSetup:.32,perfectChance:.55},
      hard:{widthMargin:.4,depthMargin:1,openThreshold:.7,attackPower:85,controlPower:69,defensePower:50,scatter:.14,perfectSetup:.24,perfectChance:.8},
    },
    defenseDepthMargin:.5,defenseWidthMargin:.25,defenseHeight:.75,
    backhandOffset:2.2, // 当前角色均为右手持拍，向对手反手侧施压
    returnPowerJitter:3, // 战术确定后的小幅执行波动
    rescueSpeedMultiplier:1.38,rescueStaminaCost:16,rescueMinimumStamina:24, // 差一点够不到时消耗体力冲刺救球
    approachLandingDepth:7.4,approachContactDepth:8.2,approachOpponentOffset:.75,approachMinimumStamina:32, // 短落点或前场击球、对手略失位时主动上网
  },
  tactics:{
    attackDepth:3.2,baselineDepth:11.2, // 主动上网/回防底线的站位纵深，距网米数
    attackMoveMultiplier:1, // 主动上网按正常跑速推进，不使用普通回位的减速倍率
    attackVolleyDepth:8,attackVolleyMinHeight:.45,attackVolleyMaxHeight:2.5, // 主动上网时扩大截击区域和高度，米
    attackVolleyMaxSpeed:40,attackSmashMaxSpeed:38, // 主动上网允许截击普通高速来球，米/模拟秒
    attackSmashMinHeight:2.1,attackSmashMaxHeight:3.7,attackSmashRiseSpeed:1, // 高压高度与允许的微小上升速度
    attackSetupTime:.06, // 主动拦截站稳余量，模拟秒；仍需实际追得到球
    volleyMinHeight:.65,volleyMaxHeight:2.1,volleyDepth:6, // 网前截击高度及距网最远距离，米
    volleyMaxSpeed:25, // 允许主动截击的软球最高来球速度，米/模拟秒
    smashMinHeight:2.2,smashMaxHeight:3.5,smashMaxSpeed:27, // 高压：下降高球的高度及速度上限
    airSetupTime:.16, // 落地前击球的站稳准备时间，模拟秒
    waistHeight:1.1, // 最佳击球高度
    minimumNetDistance:1, // 接球点离网最小距离
    afterBounceTime:.12, // 弹地后最少等待时间
    minimumExtension:.7, // 接球点离弹地点的最小距离
    minimumHeight:.4,maximumHeight:1.65, // 可接球高度范围
    stanceSide:.68,stanceBehind:.6, // 接球站位相对球的侧向/后向偏移
    setupTime:.1, // 接球前准备余量
    waistTolerance:.16,waistExtension:1.05, // 理想腰部击球容差
    heightWeight:6,distanceWeight:.035,timeWeight:.025,backhandPenalty:.025, // 接球候选评分权重
    approachDepth:6,nearRecoveryDepth:8.6,deepRecoveryDepth:10.8, // 回位纵深选择
    fallbackOpponentDepth:10,recoveryWidth:2.8, // 无预测时对手纵深及回位横向限制
    predictionSteps:1680, // 来球预测最多模拟步数
    rallyTimeout:7,escapeMargin:1, // 无有效回球超时/球超出缓冲区后额外判定距离
  },
  animation:{
    strokeDuration:1.05,serveDuration:1.35, // 正反手/发球动作总时长
    contact:.42,serveContact:.72, // 击球在动作时间中的比例
    coil:.22,drive:.32,finish:.64,recover:.76, // 引拍/发力/随挥/回位关键帧比例
    jointDamping:18,velocityDamping:10, // 关节与速度变化的平滑系数
    strokeDamping:32, // 挥拍时关节跟随速度，减少触球瞬间滞后
    strideDuringStroke:.22, // 挥拍过程中保留的跑动幅度，避免击球时腿部仍大幅摆动
    weightDepth:.18,stanceWidth:.1, // 击球重心前后转移、站距加宽（米）
    serveTrophy:.34,serveDrop:.57,serveFinish:.86, // 发球奖杯姿势、拍头下沉、随挥关键时刻
    contactHold:.08, // 转头视线在触球后保持的动作比例
    splitDuration:.34,splitHeight:.09,splitBend:.25,splitWidth:.08, // 对手出拍时垫步：时长、腾空、落地屈膝、双脚展开
    serveToss:.16,serveTossPeak:.48,serveTossExtra:.65, // 发球抛球动作时刻、球到顶点时刻、顶点高于触球点的米数
    stepLength:.72,stepLift:.12,shuffleLift:.055, // 每步周期位移、跑步/横移抬脚高度（米）
    footPlantRatio:.6, // 每个步态周期的支撑阶段比例
    openWidth:.34,closedWidth:.20,closedDepth:.28, // 开放式半站距、关闭式半站距与前后错位（米）
    openLateralSpeed:1.2, // 横向追球超过此速度优先开放式，米/真实秒
    footDamping:24, // 脚步目标过渡速度
    closedFrontYaw:.2,closedRearYaw:.7,closedStepLift:.045, // 关闭式前/后脚朝向及调整站位时的抬脚高度
    fullStrideSpeed:5, // 达到完整步幅的速度
    gaitBase:7,gaitSpeed:10,gaitFade:4, // 步频基础值/速度增量/低速淡出
    teleportDistance:1, // 单帧移动超过该值视为换位，不播放跑动
    runningThreshold:.01, // 开始跑动摆臂的步幅阈值
    hop:.03,idleHop:.012, // 跑动起伏/待机呼吸起伏
    trailPoints:13, // 球拍拖尾最多点数
    strokeTrailStart:.3,strokeTrailEnd:.74,serveTrailStart:.5,serveTrailEnd:.88, // 拖尾时间范围
  },
  match:{gamesToWin:6,noAd:false,difficulty:'normal'}, // 菜单默认局数、金球制开关、难度
  court:{
    halfWidth:4.115,halfLength:11.885,doublesHalfWidth:5.485,serviceDepth:6.4, // 标准单打8.23×23.77米、双打10.97×23.77米
    runBack:6.4,sideRun:3.66, // ITF国际比赛建议最小缓冲区：底线后/双打边线外，米
    playerBoundaryMargin:.35, // 球员站位距场地外缘的最小余量
    lineWidth:.05, // 场线宽度，米
    bufferColor:'#466b4d', // 缓冲区地面颜色
    grassColors:['#719655','#789d5d'], // 场内草地条纹
  },
  layout:{
    edge:12,top:16,bottom:34, // 桌面取景留白，像素
    portraitTop:112,portraitRight:12,portraitBottom:30, // 竖屏顶部为比分和测速留白
    landscapeLeft:148,landscapeRight:12,landscapeTop:12,landscapeBottom:22, // 横屏为紧凑计分板留白
    minimumWidth:100,minimumHeight:130,fallbackLeft:8,fallbackTop:12, // 极小窗口保护
    mobilePowerWidth:48,desktopPowerWidth:80, // 力量条区域宽度
    serveSize:248,shotWidth:290,shotHeight:265, // 手势控件设计尺寸，修改须同步 CSS/SVG
    gestureMobileRight:8,gestureDesktopRight:8,gestureLeft:8, // 手势边界留白，不再为旁边力量条让位
    serveTop:36,shotTop:18,gestureBottom:22, // 手势纵向留白
    gesturePowerWidth:52,gesturePowerHeight:204,gesturePowerGap:8, // 落点旁力量条尺寸与间距，像素
    targetPowerTop:112, // 力量条避开顶部计分与测速区，像素
    floorSideMargin:.2,floorDepthMargin:.2, // 缓冲区外缘的额外取景余量
    playerHeight:2.7, // 缓冲区内跑动球员取景高度
  },
  view:{
    fieldOfView:43, // 相机垂直视角
    desktopPixelRatio:2,mobilePixelRatio:1.5, // 像素倍率上限
    exposure:1.15, // 画面曝光
    mobileWidth:900,mobileHeight:500, // 判定移动端布局的尺寸阈值
    cameraY:20,cameraZ:27, // 所有设备统一相机方向，仅距离按屏幕比例适配
    cameraFar:220,cameraPadding:1.012, // 相机远平面、取景余量
    visibleBufferFraction:.45, // 镜头保留的缓冲区比例；越小视角越近，场地实体尺寸不变
    previewMs:70,mobilePreviewMs:120, // 轨迹预览刷新间隔
    previewChangeMs:100,previewGaugeDelta:.02, // 力量变化触发预览的节流
    energyOffset:8, // 体力条距离脚底的屏幕偏移，像素
    energyWidth:84, // 体力条最小宽度，像素
    humanColor:'#f5f0d8',humanAccent:'#386552', // 玩家球衣/装饰颜色
    cpuColor:'#d88960',cpuAccent:'#f1dfb0', // 电脑球衣/装饰颜色
    background:'#274b38', // 天空与雾颜色
  },
};

// 关节姿态配置：right/left/wrist 为 [X,Y,Z] 弧度；elbow 为屈肘角，
// yaw/hipYaw 为转肩/转髋，pitch 为前倾，bend 为屈膝，weight 为重心横移（米）。
export const READY_POSE={right:[1.05,-.15,-.25],left:[.8,.2,.35],elbowR:.65,elbowL:.55,wrist:[-.3,0,.12],yaw:0,pitch:.04,bend:.1};
// 发球姿态：奖杯、拍头下沉、伸展触球、跨身随挥。
export function servePoses(pad={x:0,y:0}){
  const R=READY_POSE;
  const trophy={...R,right:[1.9,-.55,1.1],left:[2.9,0,-.15],elbowR:1.7,elbowL:.1,wrist:[-.65,0,.2],yaw:-.85,hipYaw:-.5,pitch:-.18,bend:.55,weight:-.08,transfer:-1,roll:-.15};
  const drop={...trophy,right:[2.45,-.6,.65],left:[2.2,0,-.35],elbowR:1.9,wrist:[-1.1,-.4,.15],hipYaw:-.1,yaw:-.65,bend:.32,pitch:-.22,transfer:-.2};
  const hit={...R,right:[3.02,.1,.2],left:[.85,.2,-.4],elbowR:.12,elbowL:.9,wrist:[-.05-pad.y*.25,pad.x*.45,.05],hipYaw:.4,yaw:.25,pitch:.08,bend:.05,transfer:1,lift:.16,roll:.08};
  const finish={...R,right:[1.15,.5,-.75],left:[.5,0,-.4],elbowR:.65,wrist:[.5,.75,.1],hipYaw:.65,yaw:.9,pitch:.3,bend:.25,weight:-.08,transfer:.7};
  const toss={...R,right:[.4,-.5,.55],left:[2.15,0,-.15],elbowR:.8,elbowL:.08,yaw:-.55,hipYaw:-.35,bend:.22,transfer:-.6};
  return {toss,trophy,drop,hit,finish};
}
// 分阶段姿态：coil 引拍、drive 发力、contactPose 触球、finish 随挥。
// backhand 控制反手；slice/top 控制切削/上旋，其余为平击。
export function strokePoses(type,backhand){
  const R=READY_POSE,side=backhand?-1:1,slice=type==='slice',top=type==='top';
  if(slice){
    // 切削独立动作：高位拍头、略开放拍面、向前下方切入，非持拍手反向展开。
    const coil={...R,right:backhand?[1.95,.25,-.85]:[1.9,-.45,.9],left:backhand?[1.4,-.1,.2]:[1.2,.1,-.7],elbowR:.95,elbowL:.5,wrist:[.35,-.15,0],yaw:-side*.95,hipYaw:-side*.45,bend:.3,transfer:-.8};
    const drive={...coil,right:backhand?[1.65,.05,-.8]:[1.65,-.15,.8],elbowR:.55,hipYaw:side*.05,yaw:-side*.5,transfer:-.1};
    const contactPose={...R,right:backhand?[1.25,-.05,-.65]:[1.25,.1,.6],left:backhand?[.65,-.3,1.05]:[.8,.2,-.6],elbowR:.2,elbowL:.65,wrist:[.4,0,0],yaw:side*.08,hipYaw:side*.25,bend:.25,transfer:1};
    const finish={...contactPose,right:backhand?[.85,-.2,-.9]:[.85,.35,.5],left:backhand?[.5,-.4,1.15]:[.6,.2,-.75],elbowR:.3,wrist:[.3,0,0],yaw:side*.45,hipYaw:side*.35,bend:.18,transfer:.7};
    return {coil,drive,contactPose,finish};
  }
  // 右手持拍：正手在身体右侧触球；单反在左前方，非持拍手反向展开平衡。
  if(type==='smash'){
    const coil={...R,right:[2,-.5,.9],left:[2.75,0,-.2],elbowR:1.65,elbowL:.15,wrist:[-.8,-.2,.1],yaw:-.7,hipYaw:-.4,pitch:-.15,bend:.4,transfer:-.7};
    const drive={...coil,right:[2.6,-.4,.55],elbowR:1.3,wrist:[-1,-.3,.1],hipYaw:.1,yaw:-.4,bend:.2};
    const contactPose={...R,right:[2.9,.12,.2],left:[1,.1,-.4],elbowR:.1,elbowL:.8,wrist:[-.1,.15,0],hipYaw:.4,yaw:.25,transfer:1,lift:.12,bend:.06};
    const finish={...contactPose,right:[1.15,.65,-.7],elbowR:.65,wrist:[.35,.65,0],yaw:.8,pitch:.28,bend:.22,lift:0,transfer:.6};
    return {coil,drive,contactPose,finish};
  }
  if(type==='volley'){
    const coil={...R,right:backhand?[1.35,-.3,-.7]:[1.3,-.25,.65],elbowR:.65,left:[1,.2,-.4],yaw:-side*.35,hipYaw:-side*.2,bend:.3,transfer:-.3};
    const drive={...coil,right:backhand?[1.45,-.1,-.6]:[1.4,0,.55],elbowR:.4,transfer:.2};
    const contactPose={...drive,right:backhand?[1.45,.1,-.55]:[1.4,.15,.5],elbowR:.22,wrist:[.25,0,0],yaw:side*.08,transfer:1};
    const finish={...contactPose,right:backhand?[1.3,.2,-.5]:[1.35,.25,.4],elbowR:.35,yaw:side*.22,bend:.15,transfer:.7};
    return {coil,drive,contactPose,finish};
  }
  const coil={...R,right:backhand?[1.1,.55,-.9]:[slice?1.75:.8,-.75,1.1],left:backhand?[1.15,-.2,.35]:[1.3,.1,-.7],elbowR:1.15,elbowL:.6,wrist:[slice?.4:-.65,-.4,side*.15],yaw:-side*1.05,hipYaw:-side*.55,pitch:.08,bend:.42,weight:side*.1,transfer:-1};
  // 髋先打开，肩仍保持侧转，拍头落到球下方（切削则从高向低）。
  const drive={...coil,right:backhand?[.85,.1,-.85]:[slice?1.55:.6,-.45,.9],elbowR:.8,wrist:[slice?.4:-.85,-.3,side*.12],hipYaw:side*.12,yaw:-side*.65,bend:.3,weight:side*.04,transfer:-.25};
  const contactPose={...R,right:backhand?[1.25,-.05,-.65]:[1.25,.1,.6],left:backhand?[.65,-.3,1.05]:[.9,.2,-.5],elbowR:.15,elbowL:.7,wrist:[slice?.35:top?-.15:0,0,0],yaw:side*.15,hipYaw:side*.4,pitch:.08,bend:.16,weight:-side*.07,transfer:1};
  const finish={...contactPose,right:backhand?[slice?1.05:1.8,-.5,-1]:[slice?1.05:top?2.15:1.85,.65,-.65],left:backhand?[.4,-.4,1.1]:[.8,.2,-.4],elbowR:backhand?.25:1.05,wrist:[slice?.5:top?.45:.25,.2,-side*.2],yaw:side*.9,hipYaw:side*.6,bend:.12,weight:-side*.1,transfer:.65};
  return {coil,drive,contactPose,finish};
}
