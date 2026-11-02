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
    shotTypeCost:{flat:0,top:4,slice:2}, // 平击、上旋、切削附加消耗
    perfectCostMultiplier:.7, // Perfect 消耗倍率
    lowThreshold:30, // 低于此绝对体力值开始降低球速和稳定性
    minimumMoveMultiplier:.45, // 零体力时移动速度倍率
    maximumPaceLoss:.3, // 零体力最大球速系数损失（30%）
    maximumScatter:1.6, // 零体力落点偏移半径；不裁剪至场内
    scatterExponent:2, // 疲劳与偏移强度的曲线指数
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
    humanSpeed:6.5, // 玩家满体力速度，米/模拟秒
    cpuSpeed:{easy:4.8,normal:6.8,hard:8.8}, // 三档电脑速度
    recoveryMultiplier:.84, // 击球后回位速度倍率
    recoveryDelay:.18, // 击球后开始回位的延迟
    arrivalTolerance:.025, // 判定到达移动目标的距离
  },
  shot:{
    speedKmh:{flat:120,top:115,slice:100}, // 满体力、基准力量下的回球出拍速度，km/h
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
  },
  physics:{
    step:1/240, // 固定物理步长，秒
    timeScale:.62, // 球与移动模拟相对真实时间的倍率
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
    serveSideSpin:85, // 发球最大侧旋角速度
  },
  input:{
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
  ai:{
    serveWait:1.2, // 电脑准备发球等待时间
    servePowerMin:55,servePowerRange:15, // 电脑发球力量范围
    returnPowerMin:45,returnPowerRange:30, // 电脑回球力量范围
    serveSideRange:1.4, // 发球左右旋随机范围
    secondServeTop:.65,firstServeTopRange:.45, // 二发上旋、一发上旋范围
    serveXMin:1.4,serveXRange:1.8, // 发球目标横向距离及随机范围
    serveDepthMin:5.7,serveDepthRange:.4, // 发球目标纵深及随机范围，避免浅发球
    returnWidth:7,returnDepthMin:6,returnDepthRange:4, // 回球落点范围
  },
  tactics:{
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
    rallyTimeout:7,escapeBoundary:18, // 无有效回球的超时时间/出场边界
  },
  animation:{
    strokeDuration:1.05,serveDuration:1.35, // 正反手/发球动作总时长
    contact:.42,serveContact:.72, // 击球在动作时间中的比例
    coil:.22,drive:.32,finish:.64,recover:.76, // 引拍/发力/随挥/回位关键帧比例
    jointDamping:18,velocityDamping:10, // 关节与速度变化的平滑系数
    fullStrideSpeed:5, // 达到完整步幅的速度
    gaitBase:7,gaitSpeed:10,gaitFade:4, // 步频基础值/速度增量/低速淡出
    teleportDistance:1, // 单帧移动超过该值视为换位，不播放跑动
    runningThreshold:.01, // 开始跑动摆臂的步幅阈值
    hop:.03,idleHop:.012, // 跑动起伏/待机呼吸起伏
    trailPoints:13, // 球拍拖尾最多点数
    strokeTrailStart:.3,strokeTrailEnd:.74,serveTrailStart:.5,serveTrailEnd:.88, // 拖尾时间范围
  },
  match:{gamesToWin:6,noAd:false,difficulty:'normal'}, // 菜单默认局数、金球制开关、难度
  court:{halfWidth:4.5,halfLength:12,serviceDepth:6.4}, // 单打半宽/半长/发球区纵深，与绘制共用
  layout:{
    edge:12,top:16,bottom:34, // 桌面取景留白，像素
    portraitTop:144,portraitRight:64,portraitBottom:34, // 竖屏为比分/操作区留白
    landscapeLeft:194,landscapeRight:62,landscapeTop:12,landscapeBottom:22, // 横屏取景留白
    minimumWidth:100,minimumHeight:130,fallbackLeft:8,fallbackTop:12, // 极小窗口保护
    mobilePowerWidth:48,desktopPowerWidth:80, // 力量条区域宽度
    serveSize:248,shotWidth:290,shotHeight:265, // 手势控件设计尺寸，修改须同步 CSS/SVG
    gestureMobileRight:64,gestureDesktopRight:104,gestureLeft:8, // 手势边界留白
    serveTop:36,shotTop:18,gestureBottom:22, // 手势纵向留白
    floorSideMargin:2.7,floorDepthMargin:3.3, // 场地取景边界相对单打线的余量
    playerSideMargin:1,playerDepthMargin:2.5,playerHeight:2.7, // 球员取景边界余量
  },
  view:{
    fieldOfView:43, // 相机垂直视角
    desktopPixelRatio:2,mobilePixelRatio:1.5, // 像素倍率上限
    desktopShadowSize:2048,mobileShadowSize:1024, // 阴影贴图尺寸
    exposure:1.15, // 画面曝光
    mobileWidth:900,mobileHeight:500, // 判定移动端布局的尺寸阈值
    portraitCameraY:32,portraitCameraZ:17,cameraY:20,cameraZ:27, // 相机方向
    cameraFar:220,cameraPadding:1.012, // 相机远平面、取景余量
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
// 分阶段姿态：coil 引拍、drive 发力、contactPose 触球、finish 随挥。
// backhand 控制反手；slice/top 控制切削/上旋，其余为平击。
export function strokePoses(type,backhand){
  const READY=READY_POSE,side=backhand?-1:1;
  const slice=type==='slice',top=type==='top';
  const coil={...READY,right:backhand?[1.25,.85,-1.05]:[slice?1.85:.75,-1.0,-.65],left:backhand?[1.1,-.35,.1]:[1.25,.35,.55],elbowR:1.15,elbowL:.7,wrist:[slice?.5:-.45,-.2,side*.3],yaw:-side*.85,hipYaw:-side*.42,pitch:.12,bend:.34,weight:-side*.1};
  const drive={...coil,right:backhand?[1.15,.35,-.85]:[slice?1.65:.9,-.65,-.7],elbowR:.8,hipYaw:side*.15,yaw:-side*.45,bend:.27,weight:side*.025};
  const contactPose={...READY,right:backhand?[1.45,-.65,-.6]:[1.4,.35,-.65],left:backhand?[.65,.5,.9]:[.8,-.4,.65],elbowR:.18,elbowL:.7,wrist:[slice?.45:top?-.4:-.12,0,-side*.1],yaw:side*.15,hipYaw:side*.35,pitch:.1,bend:.16,weight:side*.1};
  const finish={...contactPose,right:backhand?[slice?1.2:2.05,-1.05,-.85]:[slice?1.05:top?2.35:1.95,1.05,-.3],left:backhand?[.45,.65,1.05]:[.6,-.3,.55],elbowR:backhand?.35:.85,wrist:[slice?.55:top?-.7:-.25,.15,-side*.4],yaw:side*.85,hipYaw:side*.55,bend:.09,weight:side*.07};
  return {coil,drive,contactPose,finish};
}
