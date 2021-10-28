/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

/**
 * 图表工厂，用于初始化图表对象，为图表对象添加功能函数。
 * 全局变量名：window.chartFactory
 * 
 * 加载时依赖：
 *   无
 * 
 * 运行时依赖:
 *   jquery.js
 *   echarts.js
 *   datagear-chartSetting.js
 * 
 * 
 * 此图表工厂支持为<body>元素、图表元素添加elementAttrConst.OPTIONS属性来设置图表选项，格式为：
 * { title: { show: false },... }
 * 
 * 此图表工厂支持为<body>元素、图表元素添加elementAttrConst.THEME属性来设置图表主题，格式为：
 * { color:'...', backgroundColor:'...', ... }
 * 
 * 此图表工厂支持为<body>元素、图表元素添加elementAttrConst.LISTENER属性来设置图表监听器，格式参考chartBase.listener函数参数说明。
 * 
 * 此图表工厂支持为图表元素添加elementAttrConst.MAP属性来设置地图图表的地图名。
 * 
 * 此图表工厂支持为<body>元素、图表元素添加elementAttrConst.ECHARTS_THEME属性来设置图表ECharts主题名。
 * 
 * 此图表工厂支持为<body>元素、图表元素添加elementAttrConst.DISABLE_SETTING属性，用于禁用图表交互设置功能，
 * 值为"true"表示禁用，其他表示启用。
 * 
 * 此图表工厂支持为图表元素添加"dg-chart-on-*"属性来设置图表事件处理函数，具体参考chartBase._initEventHandlers函数说明。
 * 
 * 此图表工厂支持为图表元素添加elementAttrConst.RENDERER属性来自定义、扩展图表渲染器，具体参考chartBase._initRenderer函数说明。
 * 
 * 此图表工厂要求图表插件的图表渲染器（chartRenderer）格式为：
 * {
 *   //可选，渲染图表函数是否是异步函数，默认为false
 *   asyncRender: true、false、function(chart){ ...; return true 或者 false; }
 *   //必选，渲染图表函数
 *   render: function(chart){ ... },
 *   //可选，更新图表数据函数是否是异步函数，默认为false
 *   asyncUpdate: true、false、function(chart, results){ ...; return true 或者 false; }
 *   //必选，更新图表数据函数
 *   //results 要更新的图表数据
 *   update: function(chart, results){ ... },
 *   //可选，调整图表尺寸函数
 *   resize: function(chart){ ... },
 *   //可选，绑定图表事件处理函数
 *   //eventType 事件类型，比如："click"、"mouseover"等
 *   //handler 图表事件处理函数，格式为：function(chartEvent){ ... }
 *   on: function(chart, eventType, handler){ ... },
 *   //可选，解绑图表事件处理函数
 *   //eventType 事件类型
 *   //handler 图表事件处理函数引用
 *   off: function(chart, eventType, handler){ ... },
 *   //可选，销毁图表函数
 *   destroy: function(chart){ ... }
 * }
 * 
 * 此图表工厂和dashboardFactory.js一起可以支持异步图表插件，示例如下：
 * {
 *   asyncRender: true,
 *   
 *   render: function(chart)
 *   {
 *     $.get("...", function()
 *     {
 *       ...;
 *       
 *       //将图表状态设置为已完成render
 *       chart.statusRendered(true);
 *     });
 *   },
 *   
 *   asyncUpdate: true,
 *   
 *   update: function(chart, results)
 *   {
 *     $.get("...", function()
 *     {
 *       ...;
 *       
 *       //将图表状态设置为已完成update
 *       chart.statusUpdated(true);
 *     });
 *   }
 * }
 */
(function(global)
{
	/**图表工厂*/
	var chartFactory = (global.chartFactory || (global.chartFactory = {}));
	/**图表对象基类*/
	var chartBase = (chartFactory.chartBase || (chartFactory.chartBase = {}));
	/**图表状态常量*/
	var chartStatusConst = (chartFactory.chartStatusConst || (chartFactory.chartStatusConst = {}));
	/**HTML元素属性常量*/
	var elementAttrConst = (chartFactory.elementAttrConst || (chartFactory.elementAttrConst = {}));
	/**
	 * 图表地图映射表。
	 * 地图类图表的地图名称与其地图数据地址映射表，用于为chartBase.mapURL函数提供支持。
	 * 此映射表默认为空，用户可以填充它以扩展地图名映射。
	 * 映射表格式示例：
	 * {
	 *   //绝对路径映射
	 *   china: "/map/china.json",
	 *   //相对路径映射
	 *   beijing: "map/beijing.json",
	 *   //相对路径映射
	 *   shanghai: "../map/shanghai.json",
	 *   //自定义映射逻辑函数，用于处理未设置对应关系的映射
	 *   mapURL: function(name)
	 *   {
	 *     return "...";
	 *   }
	 * }
	 */
	var chartMapURLs = (chartFactory.chartMapURLs || (chartFactory.chartMapURLs = {}));

	//----------------------------------------
	// chartStatusConst开始
	//----------------------------------------
	
	/**图表状态：准备render*/
	chartStatusConst.PRE_RENDER = "PRE_RENDER";
	
	/**图表状态：正在render*/
	chartStatusConst.RENDERING = "RENDERING";
	
	/**图表状态：完成render*/
	chartStatusConst.RENDERED = "RENDERED";
	
	/**图表状态：准备update*/
	chartStatusConst.PRE_UPDATE = "PRE_UPDATE";
	
	/**图表状态：正在update*/
	chartStatusConst.UPDATING = "UPDATING";
	
	/**图表状态：完成update*/
	chartStatusConst.UPDATED = "UPDATED";
	
	/**图表状态：已销毁*/
	chartStatusConst.DESTROYED = "DESTROYED";

	//----------------------------------------
	// chartStatusConst结束
	//----------------------------------------

	//----------------------------------------
	// elementAttrConst开始
	//----------------------------------------
	
	/**图表部件*/
	elementAttrConst.WIDGET = "dg-chart-widget";
	
	/**图表选项*/
	elementAttrConst.OPTIONS = "dg-chart-options";
	
	/**图表主题*/
	elementAttrConst.THEME = "dg-chart-theme";
	
	/**图表监听器*/
	elementAttrConst.LISTENER = "dg-chart-listener";
	
	/**图表地图*/
	elementAttrConst.MAP = "dg-chart-map";
	
	/**图表ECharts主题*/
	elementAttrConst.ECHARTS_THEME = "dg-echarts-theme";
	
	/**图表禁用设置*/
	elementAttrConst.DISABLE_SETTING = "dg-chart-disable-setting";
	
	/**图表事件处理（前缀）*/
	elementAttrConst.ON = "dg-chart-on-";
	
	/**图表渲染器*/
	elementAttrConst.RENDERER = "dg-chart-renderer";
	
	//----------------------------------------
	// elementAttrConst结束
	//----------------------------------------
	
	/**图表事件的图表类型：ECharts*/
	chartFactory.CHART_EVENT_CHART_TYPE_ECHARTS = "echarts";
	
	/**图表事件的图表类型：HTML*/
	chartFactory.CHART_EVENT_CHART_TYPE_HTML = "html";
	
	/**内置名字标识片段*/
	chartFactory._BUILT_IN_NAME_PART = "datagear";
	
	/**内置名字标识片段*/
	chartFactory._BUILT_IN_NAME_UNDERSCORE_PREFIX = "_" + chartFactory._BUILT_IN_NAME_PART;
	
	/**数据对象的原始信息属性名*/
	chartFactory._DATA_ORIGINAL_INFO_PROP_NAME = chartFactory._BUILT_IN_NAME_UNDERSCORE_PREFIX + "OriginalInfo";
	
	/**图表主题的CSS信息属性名*/
	chartFactory._KEY_THEME_STYLE_SHEET_INFO = chartFactory._BUILT_IN_NAME_UNDERSCORE_PREFIX + "StyleSheetInfo";
	
	/** 关键字：注册得ECharts主题名 */
	chartFactory._KEY_REGISTERED_ECHARTS_THEME_NAME = chartFactory._BUILT_IN_NAME_UNDERSCORE_PREFIX + "RegisteredEchartsThemeName";
	
	/** 关键字：可作为定位父元素的样式类名 */
	chartFactory._KEY_CHART_ELEMENT_STYLE_FOR_RELATIVE = "dg-position-relative";
	
	/**
	 * 图表使用的渲染上下文属性名。
	 */
	chartFactory.renderContextAttrs =
	{
		//可选，图表主题，org.datagear.analysis.ChartTheme
		chartTheme: "chartTheme",
		//必须，Web上下文，org.datagear.analysis.support.html.HtmlTplDashboardRenderAttr.WebContext
		webContext: "webContext"
	};
	
	/**
	 * 初始化渲染上下文。
	 * 注意：此方法应在初始化任意图表前且body已加载后调用。
	 * 
	 * @param renderContext 渲染上下文
	 */
	chartFactory.initRenderContext = function(renderContext)
	{
		var webContext = chartFactory.renderContextAttr(renderContext, chartFactory.renderContextAttrs.webContext);
		
		if(webContext == null)
			throw new Error("The render context attribute ["+chartFactory.renderContextAttrs.webContext+"] must be set");
		
		chartFactory._initChartTheme(renderContext);
	};
	
	/**
	 * 初始化渲染上下文中的图表主题。
	 * 初始渲染上下文中允许不设置图表主题，或者仅设置部分属性，比如前景色、背景色，此方法则初始化其他必要的属性。
	 * 
	 * 注意：此方法应在初始化任意图表前且body已加载后调用，因为它也会从body的elementAttrConst.THEME读取用户设置的图表主题。
	 * 
	 * @param renderContext 渲染上下文
	 */
	chartFactory._initChartTheme = function(renderContext)
	{
		var theme = chartFactory.renderContextAttrChartTheme(renderContext);
		
		if(!theme)
		{
			theme = {};
			chartFactory.renderContextAttr(renderContext, chartFactory.renderContextAttrs.chartTheme, theme);
		}
		
		if(!theme.name)
			theme.name = "chartTheme";
		if(!theme.color)
			theme.color = "#333";
		if(!theme.backgroundColor)
			theme.backgroundColor = "transparent";
		if(!theme.actualBackgroundColor)
			theme.actualBackgroundColor = "#FFF";
		if(!theme.gradient)
			theme.gradient = 10;
		if(!theme.graphColors || theme.graphColors.length == 0)
			theme.graphColors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452",
							"#9a60b4", "#ea7ccc", "#B6A2DE"];
		if(!theme.graphRangeColors || theme.graphRangeColors.length == 0)
			theme.graphRangeColors = ["#58A52D", "#FFD700", "#FF4500"];
		
		chartFactory._initChartThemeActualBackgroundColorIf(theme);
		
		var bodyThemeValue = $(document.body).attr(elementAttrConst.THEME);
		if(bodyThemeValue)
		{
			var bodyThemeObj = chartFactory.evalSilently(bodyThemeValue, {});
			chartFactory._initChartThemeActualBackgroundColorIf(bodyThemeObj);
			
			chartFactory._GLOBAL_RAW_CHART_THEME = $.extend(true, {}, theme, bodyThemeObj);
			
			chartFactory._inflateChartThemeIf(bodyThemeObj);
			
			// < @deprecated 兼容1.5.0版本的自定义ChartTheme结构，未来版本会移除
			if(bodyThemeObj.colorSecond)
			{
				bodyThemeObj.color = bodyThemeObj.colorSecond;
				bodyThemeObj.titleColor = bodyThemeObj.color;
				bodyThemeObj.legendColor = bodyThemeObj.colorSecond;
			}
			// > @deprecated 兼容1.5.0版本的自定义ChartTheme结构，未来版本会移除
			
			$.extend(true, theme, bodyThemeObj);
		}
		
		if(!chartFactory._GLOBAL_RAW_CHART_THEME)
			chartFactory._GLOBAL_RAW_CHART_THEME = $.extend(true, {}, theme);
		
		chartFactory._inflateChartThemeIf(theme);
	};
	
	/**
	 * 初始化图表主题的实际背景色。
	 */
	chartFactory._initChartThemeActualBackgroundColorIf = function(theme)
	{
		//如果设置了非透明backgroundColor，那么也应同时设置actualBackgroundColor
		if(theme.backgroundColor && theme.backgroundColor != "transparent")
		{
			theme.actualBackgroundColor = theme.backgroundColor;
			return true;
		}
		
		return false;
	};
	
	/**
	 * 如果图表主题已具备了生成其他配色的条件（color、actualBackgroundColor已设置），则尝试生成它们。
	 */
	chartFactory._inflateChartThemeIf = function(theme)
	{
		if(theme.color && theme.actualBackgroundColor)
		{
			if(!theme.legendColor)
				theme.legendColor = chartFactory.gradualColor(theme, 0.8);
			
			if(!theme.borderColor)
				theme.borderColor = chartFactory.gradualColor(theme, 0.3);
			
			if(!theme.tooltipTheme)
			{
				var tooltipTheme =
				{
					name: "tooltipTheme",
					color: theme.actualBackgroundColor,
					backgroundColor: chartFactory.gradualColor(theme, 0.7),
					actualBackgroundColor: chartFactory.gradualColor(theme, 0.7),
					borderColor: chartFactory.gradualColor(theme, 0.9),
					borderWidth: 1,
					gradient: theme.gradient
				};
				
				theme.tooltipTheme = tooltipTheme;
			}
			
			if(!theme.highlightTheme)
			{
				var highlightTheme =
				{
					name: "highlightTheme",
					color: theme.actualBackgroundColor,
					backgroundColor: chartFactory.gradualColor(theme, 0.8),
					actualBackgroundColor: chartFactory.gradualColor(theme, 0.8),
					borderColor: chartFactory.gradualColor(theme, 1),
					borderWidth: 1,
					gradient: theme.gradient
				};
				
				theme.highlightTheme = highlightTheme;
			}
		}
		
		if(theme.color)
		{
			if(!theme.titleColor)
				theme.titleColor = theme.color;
			
			if(!theme.legendColor)
				theme.legendColor = theme.color;
		}
		
		if(theme.borderWidth && !theme.borderStyle)
			theme.borderStyle = "solid";
	};
	
	/**
	 * 初始化指定图表对象。
	 * 初始化前应确保chart.renderContext中包含chartFactory.renderContextAttrs必须的属性值。
	 * 
	 * @param chart 图表对象
	 */
	chartFactory.init = function(chart)
	{
		this._refactorChart(chart);
		
		$.extend(chart, this.chartBase);
		chart.init();
	};
	
	chartFactory._refactorChart = function(chart)
	{
		//chart.resultDataFormat属性与后面的chart.resultDataFormat()冲突，因此这里重构一下
		chart._resultDataFormat = chart.resultDataFormat;
		delete chart.resultDataFormat;
	};
	
	//----------------------------------------
	// chartBase start
	//----------------------------------------
	
	/**
	 * 初始化图表。
	 */
	chartBase.init = function()
	{
		if(!this.id)
			throw new Error("[this.id] must be defined");
		if(!this.elementId)
			throw new Error("[this.elementId] must be defined");
		if(!this.renderContext)
			throw new Error("[this.renderContext] must be defined");
		if(!this.plugin)
			throw new Error("[this.plugin] must be defined");
		
		if(this.statusRendering() || this.isActive())
			throw new Error("Chart is not ready for init");
		
		this.name = (this.name || "");
		this.chartDataSets = (this.chartDataSets || []);
		this.updateInterval = (this.updateInterval == null ? -1 : this.updateInterval);
		for(var i=0; i<this.chartDataSets.length; i++)
		{
			var cds = this.chartDataSets[i];
			cds.propertySigns = (cds.propertySigns || {});
			cds.alias = (cds.alias == null ?  "" : cds.alias);
			cds.attachment = (cds.attachment == true ? true : false);
			cds.query = (cds.query || {});
			cds.query.paramValues = (cds.query.paramValues || {});
			
			// < @deprecated 兼容2.4.0版本的chartDataSet.paramValues，将在未来版本移除，已被chartDataSet.query.paramValues取代
			cds.paramValues = cds.query.paramValues;
			// > @deprecated 兼容2.4.0版本的chartDataSet.paramValues，将在未来版本移除，已被chartDataSet.query.paramValues取代
		}
		
		this._clearExtValue();
		
		this._initBaseProperties();
		this._initOptions();
		this._initTheme();
		this._initListener();
		this._initMap();
		this._initEchartsThemeName();
		this._initDisableSetting();
		this._initEventHandlers();
		this._initRenderer();
		
		//最后才设置为可渲染状态
		this.statusPreRender(true);
	};
	
	/**
	 * 初始化基础属性。
	 */
	chartBase._initBaseProperties = function()
	{
		//为chartDataSets元素添加index属性，便于后续根据其索引获取结果集等信息
		this.chartDataSets = (this.chartDataSets == null ? [] : this.chartDataSets);
		for(var i=0; i<this.chartDataSets.length; i++)
		{
			this.chartDataSets[i].index = i;
		}
	};
	
	/**
	 * 初始化图表选项。
	 * 此方法依次从<body>元素、图表元素的elementAttrConst.OPTIONS属性读取、合并图表选项。
	 */
	chartBase._initOptions = function()
	{
		var options = {};
		
		var $ele = this.elementJquery();
		
		var bodyOptions = $(document.body).attr(elementAttrConst.OPTIONS);
		var eleOptions = $ele.attr(elementAttrConst.OPTIONS);
		
		if(bodyOptions)
			options = $.extend(true, options, chartFactory.evalSilently(bodyOptions, {}));
		
		if(eleOptions)
			options = $.extend(true, options, chartFactory.evalSilently(eleOptions, {}));
		
		this.options(options);
	};
	
	/**
	 * 初始化图表主题。
	 * 此方法依次从图表renderContext.chartTheme、<body>元素、图表元素的elementAttrConst.THEME属性读取、合并图表主题。
	 * 
	 * @return {...}
	 */
	chartBase._initTheme = function()
	{
		var globalRawTheme = chartFactory._GLOBAL_RAW_CHART_THEME;
		var globalTheme = this.renderContextAttr(chartFactory.renderContextAttrs.chartTheme);
		
		if(!globalTheme || !globalRawTheme)
			throw new Error("chartFactory.initRenderContext() must be called first");
		
		var eleThemeValue = this.elementJquery().attr(elementAttrConst.THEME);
		
		if(eleThemeValue)
		{
			var eleThemeObj = chartFactory.evalSilently(eleThemeValue, {});
			chartFactory._initChartThemeActualBackgroundColorIf(eleThemeObj);
			chartFactory._inflateChartThemeIf(eleThemeObj);
			
			var eleTheme = $.extend(true, {}, globalRawTheme, eleThemeObj);
			chartFactory._inflateChartThemeIf(eleTheme);
			
			this.theme(eleTheme);
		}
		else
			this.theme(globalTheme);
	};
	
	/**
	 * 初始化图表监听器。
	 * 此方法依次从图表元素、<body>元素的elementAttrConst.LISTENER属性获取监听器对象。
	 */
	chartBase._initListener = function()
	{
		var globalListener = $(document.body).attr(elementAttrConst.LISTENER);
		var localListener = this.elementJquery().attr(elementAttrConst.LISTENER);
		
		if(globalListener)
		{
			if(!chartFactory._globalChartListener)
			{
				chartFactory._globalChartListener = chartFactory.evalSilently(globalListener);
			}
			
			globalListener = chartFactory._globalChartListener;
		}
		
		if(localListener)
		{
			localListener = chartFactory.evalSilently(localListener);
		}
		
		var myListener = null;
		
		if(!localListener && !globalListener)
		{
			myListener = null;
		}
		else if(!localListener)
		{
			myListener = globalListener;
		}
		else if(!globalListener)
		{
			myListener = localListener;
		}
		else
		{
			//实现局部图表监听器继承全局图表监听器功能
			myListener =
			{
				//标识这是一个由元素图表监听器属性生成的内部代理图表监听器
				_proxyChartListenerFromEleAttr: true,
				_listeners: [localListener, globalListener],
				render: function(chart)
				{
					var dl = this._findListenerOfFunc("render");
					
					if(dl)
						return dl.render(chart);
				},
				update: function(chart, results)
				{
					var dl = this._findListenerOfFunc("update");
					
					if(dl)
						return dl.update(chart, results);
				},
				onRender: function(chart)
				{
					var dl = this._findListenerOfFunc("onRender");
					
					if(dl)
						return dl.onRender(chart);
				},
				onUpdate: function(chart, results)
				{
					var dl = this._findListenerOfFunc("onUpdate");
					
					if(dl)
						return dl.onUpdate(chart, results);
				},
				_findListenerOfFunc: function(funcName)
				{
					for(var i=0; i<this._listeners.length; i++)
					{
						if(this._listeners[i] && this._listeners[i][funcName])
							return this._listeners[i];
					}
					
					return null;
				}
			};
		}
		
		this.listener(myListener);
	};
	
	/**
	 * 初始化图表的地图名。
	 * 此方法从图表元素的elementAttrConst.MAP属性获取图表地图名。
	 */
	chartBase._initMap = function()
	{
		var map = this.elementJquery().attr(elementAttrConst.MAP);
		
		if(map)
			this.map(map);
	};
	
	/**
	 * 初始化图表的ECharts主题名。
	 * 此方法依次从图表元素、<body>元素的elementAttrConst.ECHARTS_THEME属性获取ECharts主题名。
	 */
	chartBase._initEchartsThemeName = function()
	{
		var themeName = this.elementJquery().attr(elementAttrConst.ECHARTS_THEME);
		
		if(!themeName)
			themeName = $(document.body).attr(elementAttrConst.ECHARTS_THEME);
		
		this.echartsThemeName(themeName);
	};
	
	/**
	 * 初始化图表是否禁用交互设置。
	 * 此方法从图表元素的elementAttrConst.DISABLE_SETTING属性获取是否禁用值。
	 */
	chartBase._initDisableSetting = function()
	{
		var globalSetting = $(document.body).attr(elementAttrConst.DISABLE_SETTING);
		var localSetting = this.elementJquery().attr(elementAttrConst.DISABLE_SETTING);
		
		globalSetting = this._evalDisableSettingAttr(globalSetting);
		
		if(localSetting != null && localSetting != "")
		{
			localSetting = this._evalDisableSettingAttr(localSetting);
			localSetting = $.extend({}, globalSetting, localSetting);
		}
		else
			localSetting = globalSetting;
		
		this.disableSetting(localSetting);
	};
	
	chartBase._evalDisableSettingAttr = function(settingAttr)
	{
		var setting = {};
		
		if(settingAttr == null || settingAttr == "")
			settingAttr == "false";
		
		if(settingAttr == "false" || settingAttr == false)
		{
			setting.param = false;
			setting.data = false;
		}
		else if(settingAttr == "true" || settingAttr == true)
		{
			setting.param = true;
			setting.data = true;
		}
		else
		{
			var tmpSetting = chartFactory.evalSilently(settingAttr, {});
			setting = $.extend(setting, tmpSetting);
		}
		
		return setting;
	};
	
	/**
	 * 初始化图表事件处理函数。
	 * 此方法从图表元素的所有以elementAttrConst.ON开头的属性获取事件处理函数。
	 * 例如：
	 * dg-chart-on-click="clickHandler" 						定义"click"事件处理函数；
	 * dg-chart-on-mouseover="function(chartEvent){ ... }"		定义"mouseover"事件处理函数。
	 */
	chartBase._initEventHandlers = function()
	{
		var dom = this.element();
		var attrs = dom.attributes;
		
		var ehs = [];
		
		var prefix = elementAttrConst.ON;
		
		for(var i=0; i<attrs.length; i++)
		{
			var an = attrs[i];
			
			if(an.nodeName.indexOf(prefix) == 0 && an.nodeName.length > prefix.length)
			{
				var eventType = an.nodeName.substr(prefix.length);
				var eventHandler = chartFactory.evalSilently(an.nodeValue);
				
				if(eventHandler)
					ehs.push({ eventType: eventType, eventHandler: eventHandler });
			}
		}
		
		this.eventHandlers(ehs);
	};
	
	/**
	 * 初始化自定义图表渲染器。
	 * 此方法从图表元素的elementAttrConst.RENDERER属性获取自定义图表渲染器。
	 */
	chartBase._initRenderer = function()
	{
		var renderer = this.elementJquery().attr(elementAttrConst.RENDERER);
		
		if(renderer)
		{
			renderer = chartFactory.evalSilently(renderer);
			
			if(renderer)
				this.renderer(renderer);
		}
	};
	
	/**
	 * 获取/设置图表选项，这些选项通常用于控制图表展示、交互效果，格式为：{ ... }。
	 * 
	 * 图表初始化时会使用图表元素的"dg-chart-options"属性值执行设置操作。
	 *
	 * 图表渲染器实现相关：
	 * 图表渲染器应使用此函数获取并应用图表选项，另参考chart.inflateRenderOptions()、chart.inflateUpdateOptions()。
	 * 
	 * @param options 可选，要设置的图表选项，没有则执行获取操作
	 */
	chartBase.options = function(options)
	{
		if(options === undefined)
			return this._options;
		else
			this._options = options;
	};
	
	/**
	 * 获取/设置图表主题，格式参考：org.datagear.analysis.ChartTheme。
	 * 
	 * 图表初始化时会使用图表元素的"dg-chart-theme"属性值执行设置操作。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应使用此函数获取并应用图表主题，另参考：chart.gradualColor()。
	 * 
	 * @param theme 可选，要设置的图表主题，没有则执行获取操作
	 */
	chartBase.theme = function(theme)
	{
		if(theme === undefined)
			return this._theme;
		else
			this._theme = theme;
	};
	
	/**
	 * 获取/设置图表监听器。
	 * 图表监听器格式为：
	 * {
	 *   //渲染图表完成回调函数
	 *   render: function(chart){ ... },
	 *   //更新图表数据完成回调函数
	 *   update: function(chart, results){ ... },
	 *   //可选，渲染图表前置回调函数，返回false将阻止渲染图表
	 *   onRender: function(chart){ ... },
	 *   //可选，更新图表数据前置回调函数，返回false将阻止更新图表数据
	 *   onUpdate: function(chart, results){ ... }
	 * }
	 * 
	 * 图表初始化时会使用图表元素的"dg-chart-listener"属性值执行设置操作。
	 * 
	 * @param listener 可选，要设置的监听器对象，没有则执行获取操作
	 */
	chartBase.listener = function(listener)
	{
		if(listener === undefined)
			return this._listener;
		else
			this._listener = listener;
	};
	
	/**
	 * 获取/设置图表地图名。
	 * 此方法用于为地图类图表提供支持，如果不是地图类图表，则不必设置此项。
	 * 
	 * 图表初始化时会使用图表元素的"dg-chart-map"属性值执行设置操作。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应使用此函数获取并应用图表地图。
	 * 
	 * @param map 可选，要设置的地图名，没有则执行获取操作
	 */
	chartBase.map = function(map)
	{
		if(map === undefined)
			return this._map;
		else
			this._map = map;
	};
	
	/**
	 * ECharts图表支持函数：获取/设置图表的ECharts主题名。
	 * 此方法用于为ECharts图表提供支持，如果不是ECharts图表，则不必设置此项。
	 * 
	 * 图表初始化时会使用图表元素的"dg-echarts-theme"属性值执行设置操作。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应使用此函数获取并应用ECharts主题。
	 * 
	 * @param themeName 可选，要设置的且已注册的ECharts主题名，没有则执行获取操作
	 */
	chartBase.echartsThemeName = function(themeName)
	{
		if(themeName === undefined)
			return this._echartsThemeName;
		else
			this._echartsThemeName = themeName;
	};
	
	/**
	 * 获取/设置图表是否禁用设置。
	 * 
	 * 图表初始化时会使用图表元素的"dg-chart-disable-setting"属性值执行设置操作。
	 * 
	 * @param setting 可选，禁用设置，没有则执行获取操作且返回格式为：{param: true||false, data: true||false}。
	 * 					禁用设置格式为：
	 * 					//全部禁用
	 * 					true、"true"、
	 * 					//全部启用
	 * 					false、"false"、
	 * 					//详细设置
	 *					{
	 *						//可选，是否禁用参数
	 *						param: false || true,
	 *						//可选，是否禁用数据透视表
	 *						data: true || false
	 *					}
	 */
	chartBase.disableSetting = function(setting)
	{
		var defaultSetting =
		{
			//影响图表主体功能，因此默认启用
			param: false,
			//不影响图表主体功能，因此默认禁用
			data: true
		};
		
		if(setting === undefined)
		{
			return (this._disableSetting == null ? defaultSetting : this._disableSetting);
		}
		else
		{
			if(setting == true || setting == "true")
			{
				setting = {param: true, data: true};
			}
			else if(setting == false || setting == "false")
			{
				setting = {param: false, data: false};
			}
			
			this._disableSetting = $.extend(defaultSetting, setting);
		}
	};
	
	/**
	 * 获取/设置图表事件处理函数数组。
	 * 
	 * 图表初始化时会使用图表元素的"dg-chart-on-*"属性值执行设置操作。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现on函数，以支持此特性。
	 * 
	 * @param eventHandlers 可选，要设置的初始事件处理函数数组，没有则执行获取操作。数组元素格式为：
	 * 						{ eventType: "...", eventHandler: function(chartEvent){ ... } }
	 */
	chartBase.eventHandlers = function(eventHandlers)
	{
		if(eventHandlers === undefined)
			return this._eventHandlers;
		else
			this._eventHandlers = eventHandlers;
	};
	
	/**
	 * 获取/设置自定义图表渲染器。
	 * 
	 * 图表初始化时会使用图表元素的"dg-chart-renderer"属性值执行设置操作。
	 * 
	 * @param renderer 可选，要设置的自定义图表渲染器，自定义图表渲染器允许仅定义要重写的图表插件渲染器函数
	 * @returns 要获取的自定义图表渲染器，没有则返回null
	 */
	chartBase.renderer = function(renderer)
	{
		if(renderer === undefined)
			return this._renderer;
		else
			this._renderer = renderer;
	};
	
	/**
	 * 获取/设置结果数据格式。
	 * 设置了新的结果数据格式后，下一次图表刷新数据将采用这个新格式。
	 * 
	 * @param resultDataFormat 可选，要设置的结果数据格式，结构参考：org.datagear.analysis.ResultDataFormat
	 * @returns 要获取的结果数据格式，没有则返回null
	 */
	chartBase.resultDataFormat = function(resultDataFormat)
	{
		if(resultDataFormat === undefined)
			return this._resultDataFormat;
		else
			this._resultDataFormat = resultDataFormat;
	};
	
	/**
	 * 渲染图表。
	 * 注意：只有this.statusPreRender()或者statusDestroyed()为true，此方法才会执行。
	 * 注意：
	 * 从render()开始产生的新扩展图表属性值都应该使用extValue()函数设置/获取，
	 * 因为图表会在destroy()中清除extValue()设置的所有值，之后允许重新render()。
	 */
	chartBase.render = function()
	{
		var $element = this.elementJquery();
		
		if(!this.statusPreRender() && !this.statusDestroyed())
			throw new Error("Chart is not ready for render");
		
		if(chartFactory.renderedChart($element) != null)
			throw new Error("Chart element '#"+this.elementId+"' has been rendered");
		
		this._createChartEleThemeCssIfNon();
		
		//如果图表元素不可作为相对定位的父元素，则设置，便于子元素在图表元素内处理定位
		var position = $element.css("position");
		if(!position || position == "static")
			$element.addClass(chartFactory._KEY_CHART_ELEMENT_STYLE_FOR_RELATIVE);
		
		$element.addClass(this.themeStyleName());
		$element.data(chartFactory._KEY_ELEMENT_RENDERED_CHART, this);
		
		this.statusRendering(true);
		
		var doRender = true;
		
		var listener = this.listener();
		if(listener && listener.onRender)
		  doRender = listener.onRender(this);
		
		if(doRender != false)
		{
			this.doRender();
		}
	};
	
	chartBase._createChartEleThemeCssIfNon = function()
	{
		var theme = this.theme();
		
		this.themeStyleSheet(chartFactory.builtinPropName("ChartEle"), function()
		{
			var css=
			{
				name: "",
				value:
				{
					"color": theme.color,
					"background-color": theme.backgroundColor,
					"border-color": theme.borderColor
				}
			};
			
			if(theme.borderWidth)
			{
				css.value["border-width"] = theme.borderWidth;
				css.value["border-style"] = "solid";
			}
			
			return css;
		});
	};
	
	/**
	 * 调用底层图表渲染器的render函数，执行渲染。
	 */
	chartBase.doRender = function()
	{
		var async = this.isAsyncRender();
		
		var renderer = this.renderer();
		
		if(renderer && renderer.render)
		{
			renderer.render(this);
		}
		else
		{
			this.plugin.chartRenderer.render(this);
		}
		
		if(!async)
			this.statusRendered(true);
	};
	
	/**
	 * 更新图表。
	 * 注意：此函数在图表渲染完成后才可调用。
	 * 注意：只有this.statusRendered()或者this.statusPreUpdate()或者this.statusUpdated()为true，此方法才会执行。
	 * 
	 * @param results 图表数据集结果
	 */
	chartBase.update = function(results)
	{
		if(!this.statusRendered() && !this.statusPreUpdate() && !this.statusUpdated())
			throw new Error("Chart is not ready for update");
		
		this.statusUpdating(true);
		
		var doUpdate = true;
		
		var listener = this.listener();
		if(listener && listener.onUpdate)
			doUpdate = listener.onUpdate(this, results);
		
		if(doUpdate != false)
		{
			this.doUpdate(results);
		}
	};
	
	/**
	 * 调用底层图表渲染器的update函数，执行更新数据。
	 */
	chartBase.doUpdate = function(results)
	{
		//先保存结果，确保updateResults()在渲染器的update函数作用域内可用
		this.updateResults(results);
		
		var async = this.isAsyncUpdate(results);
		
		var renderer = this.renderer();
		
		if(renderer && renderer.update)
		{
			renderer.update(this, results);
		}
		else
		{
			this.plugin.chartRenderer.update(this, results);
		}
		
		if(!async)
			this.statusUpdated(true);
	};
	
	/**
	 * 获取/设置图表此次更新的结果数据。
	 * 图表更新前会自动执行设置操作（通过chartBase.doUpdate()函数）。
	 * 
	 * @param results 可选，要设置的更新结果数据
	 * @returns 要获取的更新结果数据，没有则返回null
	 */
	chartBase.updateResults = function(results)
	{
		return chartFactory.extValueBuiltin(this, "updateResults", results);
	};
	
	/**
	 * 重新调整图表尺寸。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现resize函数，以支持此特性。
	 */
	chartBase.resize = function()
	{
		this._assertActive();

		var renderer = this.renderer();
		
		if(renderer && renderer.resize)
		{
			renderer.resize(this);
		}
		else if(this.plugin.chartRenderer.resize)
		{
			this.plugin.chartRenderer.resize(this);
		}
		else
		{
			//为ECharts图表提供默认resize支持
			var internal = this.internal();
			if(this._isEchartsInstance(internal))
				internal.resize();
		}
	};
	
	/**
	 * 销毁图表，释放图表占用的资源、恢复图表HTML元素初值。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现destroy函数，以支持此特性。
	 */
	chartBase.destroy = function()
	{
		this._assertActive();
		
		var $element = this.elementJquery();
		
		this.statusDestroyed(true);
		
		$element.removeClass(this.themeStyleName());
		$element.removeClass(chartFactory._KEY_CHART_ELEMENT_STYLE_FOR_RELATIVE);
		$element.data(chartFactory._KEY_ELEMENT_RENDERED_CHART, null);
		
		var renderer = this.renderer();
		
		if(renderer && renderer.destroy)
		{
			renderer.destroy(this);
		}
		else if(this.plugin.chartRenderer.destroy)
		{
			this.plugin.chartRenderer.destroy(this);
		}
		else
		{
			//为ECharts图表提供默认destroy支持
			var internal = this.internal();
			if(this._isEchartsInstance(internal) && !internal.isDisposed())
			{
				internal.dispose();
			}
			
			this.elementJquery().empty();
		}
		
		this._destroySetting();
		this.internal(null);
		
		//最后清空扩展属性值，因为上面逻辑可能会使用到
		this._clearExtValue();
	};
	
	/**
	 * 销毁图表交互设置。
	 */
	chartBase._destroySetting = function()
	{
		chartFactory.chartSetting.unbindChartSettingPanelEvent(this);
	};
	
	/**
	 * 图表的render方法是否是异步的。
	 */
	chartBase.isAsyncRender = function()
	{
		var renderer = this.renderer();
		
		if(renderer && renderer.asyncRender !== undefined)
		{
			if(typeof(renderer.asyncRender) == "function")
				return renderer.asyncRender(this);
			
			return (renderer.asyncRender == true);
		}
		
		if(this.plugin.chartRenderer.asyncRender == undefined)
			return false;
		
		if(typeof(this.plugin.chartRenderer.asyncRender) == "function")
			return this.plugin.chartRenderer.asyncRender(this);
		
		return (this.plugin.chartRenderer.asyncRender == true);
	};
	
	/**
	 * 图表的update方法是否是异步的。
	 * 
	 * @param results 图表数据集结果
	 */
	chartBase.isAsyncUpdate = function(results)
	{
		var renderer = this.renderer();
		
		if(renderer && renderer.asyncUpdate !== undefined)
		{
			if(typeof(renderer.asyncUpdate) == "function")
				return renderer.asyncUpdate(this, results);
			
			return (renderer.asyncUpdate == true);
		}
		
		if(this.plugin.chartRenderer.asyncUpdate == undefined)
			return false;
		
		if(typeof(this.plugin.chartRenderer.asyncUpdate) == "function")
			return this.plugin.chartRenderer.asyncUpdate(this, results);
		
		return (this.plugin.chartRenderer.asyncUpdate == true);
	};
	
	/**
	 * 图表是否处于活跃可用的状态（已完成渲染且未被销毁）。
	 */
	chartBase.isActive = function()
	{
		return (this._isActive == true);
	};
	
	/**
	 * 断言图表处于活跃可用的状态。
	 */
	chartBase._assertActive = function()
	{
		if(this.isActive())
			return;
		
		throw new Error("Chart is not active");
	};
	
	/**
	 * 图表是否为/设置为：准备render。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusPreRender = function(set)
	{
		if(set === true)
			this.status(chartStatusConst.PRE_RENDER);
		else
			return (this.status() == chartStatusConst.PRE_RENDER);
	};
	
	/**
	 * 图表是否为/设置为：正在render。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusRendering = function(set)
	{
		if(set === true)
			this.status(chartStatusConst.RENDERING);
		else
			return (this.status() == chartStatusConst.RENDERING);
	};
	
	/**
	 * 图表是否为/设置为：完成render。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 * @param postProcess 可选，当set为true时，是否执行渲染后置操作，比如渲染交互设置表单、绑定初始事件、调用监听器、，默认为true
	 */
	chartBase.statusRendered = function(set, postProcess)
	{
		if(set === true)
		{
			this._isActive = true;
			this.status(chartStatusConst.RENDERED);
			
			if(postProcess != false)
				this._postProcessRendered();
		}
		else
			return (this.status() == chartStatusConst.RENDERED);
	};
	
	/**
	 * 执行渲染完成后置处理。
	 */
	chartBase._postProcessRendered = function()
	{
		this._renderSetting();
		this._bindEventHandlers();
		
		var listener = this.listener();
		if(listener && listener.render)
		  listener.render(this);
	};
	
	/**
	 * 渲染图表交互设置项。
	 */
	chartBase._renderSetting = function()
	{
		chartFactory.chartSetting.bindChartSettingPanelEvent(this);
	};
	
	/**
	 * 绑定初始图表事件处理函数。
	 */
	chartBase._bindEventHandlers = function()
	{
		var ehs = this.eventHandlers();
		
		for(var i=0; i<ehs.length; i++)
			this.on(ehs[i].eventType, ehs[i].eventHandler);
	};
	
	/**
	 * 图表是否为/设置为：准备update。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusPreUpdate = function(set)
	{
		if(set === true)
			this.status(chartStatusConst.PRE_UPDATE);
		else
			return (this.status() == chartStatusConst.PRE_UPDATE);
	};
	
	/**
	 * 图表是否为/设置为：正在update。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusUpdating = function(set)
	{
		if(set === true)
			this.status(chartStatusConst.UPDATING);
		else
			return (this.status() == chartStatusConst.UPDATING);
	};
	
	/**
	 * 图表是否为/设置为：完成update。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 * @param postProcess 可选，当set为true时，是否执行更新后置操作，比如调用监听器、，默认为true
	 */
	chartBase.statusUpdated = function(set, postProcess)
	{
		if(set === true)
		{
			this.status(chartStatusConst.UPDATED);
			
			if(postProcess != false)
				this._postProcessUpdated();
		}
		else
			return (this.status() == chartStatusConst.UPDATED);
	};
	
	/**
	 * 执行更新完成后置处理。
	 */
	chartBase._postProcessUpdated = function()
	{
		var listener = this.listener();
		if(listener && listener.update)
		  listener.update(this, this.updateResults());
	};
	
	/**
	 * 图表是否为/设置为：已销毁。
	 * 
	 * @param set 可选，为true时设置状态；否则，判断状态
	 */
	chartBase.statusDestroyed = function(set)
	{
		if(set === true)
		{
			this._isActive = false;
			this.status(chartStatusConst.DESTROYED);
		}
		else
			return (this.status() == chartStatusConst.DESTROYED);
	};
	
	/**
	 * 获取/设置图表状态。
	 * 
	 * @param status 可选，要设置的状态，不设置则执行获取操作
	 */
	chartBase.status = function(status)
	{
		if(status === undefined)
			return (this._status || "");
		else
			this._status = status;
	};
	
	/**
	 * 绑定"click"事件处理函数。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现on函数，以支持此特性。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onClick = function(handler)
	{
		this.on("click", handler);
	};
	
	/**
	 * 绑定"dblclick"事件处理函数。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现on函数，以支持此特性。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onDblclick = function(handler)
	{
		this.on("dblclick", handler);
	};
	
	/**
	 * 绑定"mousedown"事件处理函数。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现on函数，以支持此特性。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onMousedown = function(handler)
	{
		this.on("mousedown", handler);
	};
	
	/**
	 * 绑定"mouseup"事件处理函数。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现on函数，以支持此特性。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onMouseup = function(handler)
	{
		this.on("mouseup", handler);
	};
	
	/**
	 * 绑定"mouseover"事件处理函数。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现on函数，以支持此特性。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onMouseover = function(handler)
	{
		this.on("mouseover", handler);
	};
	
	/**
	 * 绑定"mouseout"事件处理函数。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现on函数，以支持此特性。
	 * 
	 * @param handler 事件处理函数：function(chartEvent){}
	 */
	chartBase.onMouseout = function(handler)
	{
		this.on("mouseout", handler);
	};
	
	/**
	 * 绑定事件处理函数。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现on函数，以支持此特性。
	 * 
	 * @param eventType 事件类型：click、dblclick、mousedown、mouseup、mouseover、mouseout
	 * @param handler 事件处理函数：function(chartEvent){ ... }
	 */
	chartBase.on = function(eventType, handler)
	{
		this._assertActive();
		
		var renderer = this.renderer();
		
		if(renderer && renderer.on)
		{
			renderer.on(this, eventType, handler);
		}
		else if(this.plugin.chartRenderer.on)
		{
			this.plugin.chartRenderer.on(this, eventType, handler);
		}
		else
			throw new Error("Chart ["+this.id+"] 's [chartRenderer.on] undefined");
	};
	
	/**
	 * 解绑事件处理函数。
	 * 注意：此函数在图表渲染完成后才可调用。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应实现off函数，以支持此特性。
	 * 
	 * @param eventType 事件类型：click、dblclick、mousedown、mouseup、mouseover、mouseout
	 * @param handler 可选，解绑的事件处理函数，不设置则解绑所有此事件类型的处理函数
	 */
	chartBase.off = function(eventType, handler)
	{
		this._assertActive();
		
		var renderer = this.renderer();
		
		if(renderer && renderer.off)
		{
			renderer.off(this, eventType, handler);
		}
		else if(this.plugin.chartRenderer.off)
		{
			this.plugin.chartRenderer.off(this, eventType, handler);
		}
		//为ECharts图表提供默认off支持
		else if(this._isEchartsInstance(this.internal()))
		{
			this.echartsOffEventHandler(eventType, handler);
		}
		else
			throw new Error("Chart ["+this.id+"] 's [chartRenderer.off] undefined");
	};
	
	/**
	 * 判断此图表是否有参数化数据集。
	 */
	chartBase.hasParamDataSet = function()
	{
		var re = false;
		
		var chartDataSets = this.chartDataSets;
		for(var i=0; i<chartDataSets.length; i++)
		{
			var params = chartDataSets[i].dataSet.params;
			re = (params && params.length > 0);
			
			if(re)
				break;
		}
		
		return re;
	};
	
	/**
	 * 图表的所有/指定数据集参数值是否齐备。
	 * 
	 * @param chartDataSet 指定图表数据集或其索引，如果不设置，则取所有
	 */
	chartBase.isDataSetParamValueReady = function(chartDataSet)
	{
		chartDataSet = (typeof(chartDataSet) == "number" ? this.chartDataSets[chartDataSet] : chartDataSet);
		
		var chartDataSets = (chartDataSet ? [ chartDataSet ] : this.chartDataSets);
		
		for(var i=0; i<chartDataSets.length; i++)
		{
			var dataSet = chartDataSets[i].dataSet;
			
			if(!dataSet.params || dataSet.params.length == 0)
				continue;
			
			var paramValues = chartDataSets[i].query.paramValues;
			
			for(var j=0; j<dataSet.params.length; j++)
			{
				var dsp = dataSet.params[j];
				
				if((dsp.required+"") == "true" && paramValues[dsp.name] == null)
					return false;
			}
		}
		
		return true;
	};
	
	/**
	 * 获取/设置指定第一个数据集单个参数值。
	 * 
	 * @param name 参数名、参数索引
	 * @param value 可选，要设置的参数值，不设置则执行获取操作
	 */
	chartBase.dataSetParamValueFirst = function(name, value)
	{
		return this.dataSetParamValue(0, name, value);
	};
	
	/**
	 * 获取/设置指定数据集单个参数值。
	 * 
	 * @param chartDataSet 指定图表数据集对象、图表数据集索引
	 * @param name 参数名、参数索引
	 * @param value 可选，要设置的参数值，不设置则执行获取操作
	 */
	chartBase.dataSetParamValue = function(chartDataSet, name, value)
	{
		chartDataSet = (typeof(chartDataSet) == "number" ? this.chartDataSets[chartDataSet] : chartDataSet);
		
		if(chartDataSet == null)
			throw new Error("ChartDataSet not found for : " + chartDataSet);
		
		//参数索引
		if(typeof(name) == "number")
		{
			var dataSet = chartDataSet.dataSet;
			
			if(!dataSet.params || dataSet.params.length <= name)
				throw new Error("No data set param defined at index : "+name);
			
			name = dataSet.params[name].name;
		}
		
		var paramValues = chartDataSet.query.paramValues;
		
		if(chartDataSet._originalParamValues == null)
			chartDataSet._originalParamValues = $.extend({}, paramValues);
		
		if(value === undefined)
			return paramValues[name];
		else
			paramValues[name] = value;
	};
	
	/**
	 * 获取/设置第一个数据集参数值集。
	 * 
	 * @param paramValues 可选，要设置的参数名/值集对象，或者是与数据集参数数组元素一一对应的参数值数组，不设置则执行获取操作
	 */
	chartBase.dataSetParamValuesFirst = function(paramValues)
	{
		return this.dataSetParamValues(0, paramValues);
	};
	
	/**
	 * 获取/设置指定数据集参数值集。
	 * 
	 * @param chartDataSet 指定图表数据集或其索引
	 * @param paramValues 可选，要设置的参数值集对象，或者是与数据集参数数组元素一一对应的参数值数组，不设置则执行获取操作
	 */
	chartBase.dataSetParamValues = function(chartDataSet, paramValues)
	{
		chartDataSet = (typeof(chartDataSet) == "number" ? this.chartDataSets[chartDataSet] : chartDataSet);
		
		if(chartDataSet == null)
			throw new Error("ChartDataSet not found for : " + chartDataSet);
		
		var paramValuesCurrent = chartDataSet.query.paramValues;
		
		if(chartDataSet._originalParamValues == null)
			chartDataSet._originalParamValues = $.extend({}, paramValuesCurrent);
		
		if(paramValues === undefined)
			return paramValuesCurrent;
		else
		{
			if($.isArray(paramValues))
			{
				var params = (chartDataSet.dataSet.params || []);
				var len = Math.min(params.length, paramValues.length);
				var paramValuesObj = {};
				
				for(var i=0; i<len; i++)
				{
					var name = params[i].name;
					paramValuesObj[name] = paramValues[i];
				}
				
				paramValues = paramValuesObj;
			}
			
			chartDataSet.query.paramValues = paramValues;
			
			// < @deprecated 兼容2.4.0版本的chartDataSet.paramValues，将在未来版本移除，已被chartDataSet.query.paramValues取代
			chartDataSet.paramValues = chartDataSet.query.paramValues;
			// > @deprecated 兼容2.4.0版本的chartDataSet.paramValues，将在未来版本移除，已被chartDataSet.query.paramValues取代
		}
	};
	
	/**
	 * 重置第一个数据集参数值集。
	 */
	chartBase.resetDataSetParamValuesFirst = function()
	{
		return this.resetDataSetParamValues(0);
	};
	
	/**
	 * 重置指定数据集参数值集。
	 * 
	 * @param chartDataSet 指定图表数据集或其索引
	 */
	chartBase.resetDataSetParamValues = function(chartDataSet)
	{
		chartDataSet = (typeof(chartDataSet) == "number" ? this.chartDataSets[chartDataSet] : chartDataSet);
		
		if(chartDataSet == null)
			throw new Error("ChartDataSet not found for : " + chartDataSet);
		
		if(chartDataSet._originalParamValues == null)
			return;
		
		chartDataSet.query.paramValues = $.extend({}, chartDataSet._originalParamValues);
		
		// < @deprecated 兼容2.4.0版本的chartDataSet.paramValues，将在未来版本移除，已被chartDataSet.query.paramValues取代
		chartDataSet.paramValues = chartDataSet.query.paramValues;
		// > @deprecated 兼容2.4.0版本的chartDataSet.paramValues，将在未来版本移除，已被chartDataSet.query.paramValues取代
	};
	
	/**
	 * 获取渲染此图表的图表部件ID。
	 * 正常来说，此函数的返回值与期望渲染的图表部件ID相同（通常是chartBase.elementWidgetId()的返回值），
	 * 当不同时，表明服务端因加载图表异常（未找到或出现错误）而使用了一个备用图表，用于在页面展示异常信息。
	 */
	chartBase.widgetId = function()
	{
		//org.datagear.analysis.support.ChartWidget.ATTR_CHART_WIDGET
		return (this.attributes && this.attributes.chartWidget ? this.attributes.chartWidget.id : null);
	};
	
	/**
	 * 获取图表HTML元素。
	 */
	chartBase.element = function()
	{
		return document.getElementById(this.elementId);
	};
	
	/**
	 * 获取图表HTML元素的Jquery对象。
	 */
	chartBase.elementJquery = function()
	{
		return $("#" + this.elementId);
	};
	
	/**
	 * 获取图表HTML元素上的图表部件ID（"dg-chart-widget"属性值）。
	 * 如果图表HTML元素上未设置过图表部件ID，将返回null。
	 */
	chartBase.elementWidgetId = function()
	{
		return chartFactory.elementWidgetId(this.element());
	};
	
	/**
	 * 判断此图表是否由指定ID的图表部件渲染。
	 * 
	 * @param chartWidgetId 图表部件ID，通常是图表元素的"dg-chart-widget"值
	 */
	chartBase.isInstance = function(chartWidgetId)
	{
		return (this.widgetId() == chartWidgetId);
	};
	
	/**
	 * 获取/设置图表底层组件。
	 * 图表底层组件是用于为渲染图表提供底层支持的组件，比如：ECharts实例、表格组件、DOM元素等。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应在其render()函数内部使用此函数设置底层组件。
	 * 
	 * @param internal 可选，要设置的底层组件，不设置则执行获取操作。
	 * @returns 要获取的底层组件，没有则返回null
	 */
	chartBase.internal = function(internal)
	{
		return chartFactory.extValueBuiltin(this, "internal", internal);
	};
	
	/**
	 * 获取/设置图表渲染上下文的属性值。
	 * 
	 * @param attrName
	 * @param attrValue 要设置的属性值，可选，不设置则执行获取操作
	 */
	chartBase.renderContextAttr = function(attrName, attrValue)
	{
		return chartFactory.renderContextAttr(this.renderContext, attrName, attrValue);
	};
	
	/**
	 * 获取/设置扩展属性值。
	 * 
	 * @param name 扩展属性名
	 * @param value 要设置的扩展属性值，可选，不设置则执行获取操作
	 */
	chartBase.extValue = function(name, value)
	{
		if(value === undefined)
			return (this._extValues ? this._extValues[name] : undefined);
		else
		{
			if(!this._extValues)
				this._extValues = {};
			
			this._extValues[name] = value;
		}
	};
	
	chartBase._clearExtValue = function()
	{
		this._extValues = {};
	};
	
	/**
	 * 获取主件图表数据集对象数组，它们的用途是绘制图表。
	 * 
	 * @return []
	 */
	chartBase.chartDataSetsMain = function()
	{
		var re = [];
		
		var chartDataSets = this.chartDataSets;
		for(var i=0; i<chartDataSets.length; i++)
		{
			if(chartDataSets[i].attachment)
				continue;
			
			re.push(chartDataSets[i]);
		}
		
		return re;
	};
	
	/**
	 * 获取附件图表数据集对象数组，它们的用途不是绘制图表。
	 * 
	 * @return []
	 */
	chartBase.chartDataSetsAttachment = function()
	{
		var re = [];
		
		var chartDataSets = this.chartDataSets;
		for(var i=0; i<chartDataSets.length; i++)
		{
			if(chartDataSets[i].attachment)
			{
				re.push(chartDataSets[i]);
			}
		}
		
		return re;
	};
	
	/**
	 * 获取指定索引的图表数据集对象，没有则返回undefined。
	 * 
	 * @param index
	 */
	chartBase.chartDataSetAt = function(index)
	{
		return (!this.chartDataSets || this.chartDataSets.length <= index ? undefined : this.chartDataSets[index]);
	};
	
	/**
	 * 获取第一个主件或者附件图表数据集对象。
	 * 
	 * @param attachment 可选，true 获取第一个附件图表数据集；false 获取第一个主件图表数据集。默认值为：false
	 * @return {...} 或  undefined
	 */
	chartBase.chartDataSetFirst = function(attachment)
	{
		attachment = (attachment == null ? false : attachment);
		
		var re = undefined;
		
		var chartDataSets = this.chartDataSets;
		for(var i=0; i<chartDataSets.length; i++)
		{
			var isAttachment = chartDataSets[i].attachment;
			
			if((isAttachment && attachment == true) || (!isAttachment && attachment != true))
			{
				re = chartDataSets[i];
				break;
			}
		}
		
		return re;
	};
	
	/**
	 * 获取指定图表数据集对象名称，它不会返回null。
	 * 
	 * @param chartDataSet 图表数据集对象
	 */
	chartBase.chartDataSetName = function(chartDataSet)
	{
		if(!chartDataSet)
			return "";
		
		if(chartDataSet.alias)
			return chartDataSet.alias;
		
		var dataSet = (chartDataSet.dataSet || chartDataSet);
		
		return (dataSet ? (dataSet.name || "") : "");
	};
	
	/**
	 * 获取指定标记的第一个数据集属性，没有则返回undefined。
	 * 
	 * @param chartDataSet 图表数据集对象
	 * @param dataSign 数据标记对象、标记名称
	 * @return {...}、undefined
	 */
	chartBase.dataSetPropertyOfSign = function(chartDataSet, dataSign)
	{
		var properties = this.dataSetPropertiesOfSign(chartDataSet, dataSign);
		
		return (properties.length > 0 ? properties[0] : undefined);
	};
	
	/**
	 * 获取指定标记的数据集属性数组。
	 * 
	 * @param chartDataSet 图表数据集对象
	 * @param dataSign 数据标记对象、标记名称
	 * @return [...]
	 */
	chartBase.dataSetPropertiesOfSign = function(chartDataSet, dataSign)
	{
		var re = [];
		
		if(!chartDataSet || !chartDataSet.dataSet || !dataSign)
			return re;
		
		dataSign = (dataSign.name || dataSign);
		var dataSetProperties = (chartDataSet.dataSet.properties || []);
		var propertySigns = (chartDataSet.propertySigns || {});
		
		var signPropertyNames = [];
		
		for(var pname in propertySigns)
		{
			var mySigns = (propertySigns[pname] || []);
			
			for(var i=0; i<mySigns.length; i++)
			{
				if(mySigns[i] == dataSign || mySigns[i].name == dataSign)
				{
					signPropertyNames.push(pname);
					break;
				}
			}
		}
		
		for(var i=0; i<dataSetProperties.length; i++)
		{
			for(var j=0; j<signPropertyNames.length; j++)
			{
				if(dataSetProperties[i].name == signPropertyNames[j])
					re.push(dataSetProperties[i]);
			}
		}
		
		return re;
	};
	
	/**
	 * 获取数据集属性标签，它不会返回null。
	 * 
	 * @param dataSetProperty
	 * @return "..."
	 */
	chartBase.dataSetPropertyLabel = function(dataSetProperty)
	{
		if(!dataSetProperty)
			return "";
		
		var label = (dataSetProperty.label ||  dataSetProperty.name);
		
		return (label || "");
	};
	
	/**
	 * 返回指定索引的数据集结果，没有则返回undefined。
	 * 
	 * @param results
	 * @param index
	 */
	chartBase.resultAt = function(results, index)
	{
		return (!results || results.length <= index ? undefined : results[index]);
	};
	
	/**
	 * 返回指定图表数据集对应的数据集结果，没有则返回undefined。
	 * 
	 * @param results
	 * @param chartDataSet
	 */
	chartBase.resultOf = function(results, chartDataSet)
	{
		return this.resultAt(results, chartDataSet.index);
	};
	
	/**
	 * 返回第一个主件或者附件数据集结果，没有则返回undefined。
	 * 
	 * @param results
	 * @param attachment 可选，true 获取第一个附件图表数据集结果；false 获取第一个主件图表数据集结果。默认值为：false
	 */
	chartBase.resultFirst = function(results, attachment)
	{
		attachment = (attachment == null ? false : attachment);
		
		var index = undefined;
		
		var chartDataSets = this.chartDataSets;
		for(var i=0; i<chartDataSets.length; i++)
		{
			var isAttachment = chartDataSets[i].attachment;
			
			if((isAttachment && attachment == true) || (!isAttachment && attachment != true))
			{
				index = i;
				break;
			}
		}
		
		return (index == null ? undefined : this.resultAt(results, index));
	};
	
	/**
	 * 获取/设置数据集结果对象包含的数据。
	 * 
	 * @param result 数据集结果对象
	 * @param data 可选，要设置的数据，通常是：{ ... }、[ { ... }, ... ]，不设置则执行获取操作
	 * @return 要获取的数据集结果数据，没有则返回null
	 */
	chartBase.resultData = function(result, data)
	{
		if(data === undefined)
			return (result ? result.data : undefined);
		else
			result.data = data;
	};
	
	/**
	 * 获取数据集结果的数据对象数组。
	 * 如果数据对象是null，返回空数组：[]；如果数据对象是数组，则直接返回；否则，返回：[ 数据对象 ]。
	 * 
	 * @param result 数据集结果对象
	 * @return 不会为null的数组
	 */
	chartBase.resultDatas = function(result)
	{
		if(result == null || result.data == null)
			return [];
		
		if($.isArray(result.data))
			return result.data;
		
		return [ result.data ];
	};
	
	/**
	 * 获取第一个主件或者附件数据集结果的数据对象数组。
	 * 如果数据对象是null，返回空数组：[]；如果数据对象是数组，则直接返回；否则，返回：[ 数据对象 ]。
	 * 
	 * @param results 数据集结果数组
	 * @param attachment 可选，true 获取第一个附件图表数据集结果；false 获取第一个主件图表数据集结果。默认值为：false
	 * @return 不会为null的数组
	 */
	chartBase.resultDatasFirst = function(results, attachment)
	{
		var result = this.resultFirst(results, attachment);
		return this.resultDatas(result);
	};
	
	/**
	 * 获取数据集结果的行对象指定属性值。
	 * 
	 * @param rowObj 行对象
	 * @param property 属性对象、属性名
	 */
	chartBase.resultRowCell = function(rowObj, property)
	{
		if(!rowObj || !property)
			return undefined;
		
		var name = (property.name || property);
		return rowObj[name];
	};
	
	/**
	 * 将数据集结果的行对象按照指定properties顺序转换为行值数组。
	 * 
	 * @param result 数据集结果对象
	 * @param properties 数据集属性对象数组、属性名数组、属性对象、属性名
	 * @param row 可选，行索引，默认为0
	 * @param count 可选，获取的最多行数，默认为全部
	 * @return properties为数组时：[[..., ...], ...]；properties非数组时：[..., ...]
	 */
	chartBase.resultRowArrays = function(result, properties, row, count)
	{
		var re = [];
		
		if(!result || !properties)
			return re;
		
		var datas = this.resultDatas(result);
		
		row = (row || 0);
		var getCount = datas.length;
		if(count != null && count < getCount)
			getCount = count;
		
		if($.isArray(properties))
		{
			for(var i=row; i< getCount; i++)
			{
				var rowObj = datas[i];
				var rowVal = [];
				
				for(var j=0; j<properties.length; j++)
				{
					var p = properties[j];
					
					var name = (p ? (p.name || p) : undefined);
					if(!name)
						continue;
					
					rowVal[j] = rowObj[name];
				}
				
				re.push(rowVal);
			}
		}
		else
		{
			var name = (properties ? (properties.name || properties) : undefined);
			
			if(name)
			{
				for(var i=row; i< getCount; i++)
				{
					var rowObj = datas[i];
					re.push(rowObj[name]);
				}
			}
		}
		
		return re;
	};
	
	/**
	 * 将数据集结果的行对象按照指定properties顺序转换为列值数组。
	 * 
	 * @param result 数据集结果对象
	 * @param properties 数据集属性对象数组、属性名数组、属性对象、属性名
	 * @param row 行索引，以0开始，可选，默认为0
	 * @param count 获取的最多行数，可选，默认为全部
	 * @return properties为数组时：[[..., ...], ...]；properties非数组时：[..., ...]
	 */
	chartBase.resultColumnArrays = function(result, properties, row, count)
	{
		var re = [];

		if(!result || !properties)
			return re;
		
		var datas = this.resultDatas(result);
		
		row = (row || 0);
		var getCount = datas.length;
		if(count != null && count < getCount)
			getCount = count;
		
		if($.isArray(properties))
		{
			for(var i=0; i<properties.length; i++)
			{
				var p = properties[i];
				
				var name = (p ? (p.name || p) : undefined);
				if(!name)
					continue;
				
				var column = [];
				
				for(var j=row; j< getCount; j++)
					column.push(datas[j][name]);
				
				re[i] = column;
			}
		}
		else
		{
			var name = (properties ? (properties.name || properties) : undefined);

			if(name)
			{
				for(var i=row; i< getCount; i++)
				{
					var rowObj = datas[i];
					re.push(rowObj[name]);
				}
			}
		}
		
		return re;
	};
	
	/**
	 * 获取数据集结果的名称/值对象数组。
	 * 
	 * @param result 数据集结果对象、对象数组
	 * @param nameProperty 名称属性对象、属性名
	 * @param valueProperty 值属性对象、属性名、数组
	 * @param row 可选，行索引，以0开始，默认为0
	 * @param count 可选，获取结果数据的最多行数，默认为全部
	 * @return [{name: ..., value: ...}, ...]
	 */
	chartBase.resultNameValueObjects = function(result, nameProperty, valueProperty, row, count)
	{
		return this._resultNameValueObjects(result, nameProperty, valueProperty, row, count);
	};
	
	/**
	 * 获取数据集结果的值对象数组。
	 * 
	 * @param result 数据集结果对象、对象数组
	 * @param valueProperty 值属性对象、属性名、数组
	 * @param row 可选，行索引，以0开始，默认为0
	 * @param count 可选，获取结果数据的最多行数，默认为全部
	 * @return [{value: ...}, ...]
	 */
	chartBase.resultValueObjects = function(result, valueProperty, row, count)
	{
		return this._resultNameValueObjects(result, null, valueProperty, row, count);
	};
	
	/**
	 * 获取数据集结果指定属性、指定行的单元格值，没有则返回undefined。
	 * 
	 * @param result 数据集结果对象
	 * @param property 数据集属性对象、属性名
	 * @param row 行索引，可选，默认为0
	 */
	chartBase.resultCell = function(result, property, row)
	{
		row = (row || 0);
		
		var re = this.resultRowArrays(result, property, row, 1);
		
		return (re.length > 0 ? re[0] : undefined);
	};
	
	/**
	 * 获取数据集结果的名称/值对象数组。
	 * 
	 * @param result 数据集结果对象、对象数组
	 * @param nameProperty 名称属性对象、属性名，当为null或者空字符串时，返回的对象中将没有name属性
	 * @param valueProperty 值属性对象、属性名、数组
	 * @param row 可选，行索引，以0开始，默认为0
	 * @param count 可选，获取结果数据的最多行数，默认为全部
	 * @return [{name: ..., value: ...}, ...]
	 */
	chartBase._resultNameValueObjects = function(result, nameProperty, valueProperty, row, count)
	{
		var re = [];
		
		var datas = this.resultDatas(result);
		
		row = (row || 0);
		var getCount = datas.length;
		if(count != null && count < getCount)
			getCount = count;
		
		nameProperty = (nameProperty != null && nameProperty != "" ?
							(nameProperty.name || nameProperty) : null);
		
		if($.isArray(valueProperty))
		{
			for(var i=row; i< getCount; i++)
			{
				var name = (nameProperty ? datas[i][nameProperty] : null);
				var value = [];
				
				for(var j=0; j<valueProperty.length; j++)
				{
					var vn = (valueProperty[j].name || valueProperty[j]);
					value[j] = datas[i][vn];
				}
				
				if(nameProperty)
					re.push({ "name" : name, "value" : value });
				else
					re.push({ "value" : value });
			}
		}
		else
		{
			valueProperty = (valueProperty.name || valueProperty);
			
			for(var i=row; i< getCount; i++)
			{
				var name = (nameProperty ? datas[i][nameProperty] : null);
				var value = datas[i][valueProperty];
				
				if(nameProperty)
					re.push({ "name" : name, "value" : value });
				else
					re.push({ "value" : value });
			}
		}
		
		return re;
	};
	
	/**
	 * 获取指定地图名对应的地图数据地址。
	 * 此方法先从chartFactory.chartMapURLs查找对应的地址，如果没有，则直接返回name作为地址。
	 * 
	 * @param name 地图名称
	 */
	chartBase.mapURL = function(name)
	{
		var url = chartMapURLs[name];
		
		if(!url && typeof(chartMapURLs.mapURL) == "function")
			url = chartMapURLs.mapURL(name);
		
		url = (url || name);
		
		var webContext = chartFactory.renderContextAttrWebContext(this.renderContext);
		url = chartFactory.toWebContextPathURL(webContext, url);
		
		return url;
	};
	
	/**
	 * 加载指定名称的地图资源（通常是*.json、*.svg）。
	 * 注意：如果地图类图表插件的render/update函数中调用此函数，应该首先设置插件的asyncRender/asyncUpdate为true，
	 * 并在callback中调用chart.statusRendered(true)/chart.statusUpdated(true)，具体参考此文件顶部的注释。
	 * 
	 * @param name 地图名称
	 * @param callback 可选，加载成功回调函数，格式为：function(name, map, jqXHR){ ... }，或者也可以是JQuery的ajax配置项：{...}
	 */
	chartBase.loadMap = function(name, callback)
	{
		if(!name)
			throw new Error("[name] required");
		
		var url = this.mapURL(name);
		
		var thisChart = this;
		
		var settings =
		{
			url: url
		};
		
		if(callback == null)
			;
		else if($.isFunction(callback))
		{
			settings.success = function(map, textStatus, jqXHR)
			{
				callback.call(thisChart, name, map, jqXHR);
			}
		}
		else
		{
			settings = $.extend(settings, callback);
		}
		
		$.ajax(settings);
	};
	
	/**
	 * ECharts图表支持函数：将图表初始化为ECharts图表，设置其选项。
	 * 此方法会自动应用chartBase.theme()、chartBase.echartsThemeName()至初始化的ECharts图表。
	 * 此方法会自动调用chartBase.internal()将初始化的ECharts实例对象设置为图表底层组件。
	 * 
	 * @param options 要设置的ECharts选项
	 * @returns ECharts实例对象
	 */
	chartBase.echartsInit = function(options)
	{
		var instance = echarts.init(this.element(), this._echartsGetRegisteredThemeName());
		instance.setOption(options);
		
		this.internal(instance);
		
		return instance;
	};
	
	/**
	 * ECharts图表支持函数：设置图表的ECharts实例的选项。
	 * 
	 * @param options
	 */
	chartBase.echartsOptions = function(options)
	{
		var internal = this.internal();
		
		if(!this._isEchartsInstance(internal))
			throw new Error("Not ECharts chart");
		
		internal.setOption(options);
	};
	
	/**
	 * 给定对象是否是ECharts实例。
	 */
	chartBase._isEchartsInstance = function(obj)
	{
		return (obj && obj.setOption && obj.isDisposed && obj.dispose && obj.off);
	};
	
	/**
	 * ECharts图表支持函数：获取用于此图表的且已注册的ECharts主题名。
	 */
	chartBase._echartsGetRegisteredThemeName = function()
	{
		var themeName = this.echartsThemeName();
		
		//从ChartTheme构建ECharts主题
		if(!themeName)
		{
			var theme = this.theme();
			themeName = theme[chartFactory._KEY_REGISTERED_ECHARTS_THEME_NAME];
			
			if(!themeName)
			{
				themeName = (theme[chartFactory._KEY_REGISTERED_ECHARTS_THEME_NAME] = chartFactory.nextElementId());
				
				var echartsTheme = chartFactory.buildEchartsTheme(theme);
				echarts.registerTheme(themeName, echartsTheme);
			}
		}
		
	    return themeName;
	};
	
	/**
	 * ECharts图表支持函数：判断指定名称的ECharts地图是否已经注册过而无需再加载。
	 * 
	 * @param name ECharts地图名称
	 */
	chartBase.echartsMapRegistered = function(name)
	{
		return (echarts.getMap(name) != null);
	};
	
	/**
	 * ECharts图表支持函数：加载并注册指定名称的ECharts地图（GeoJSON、SVG），并在注册完成后执行回调函数。
	 * 注意：如果地图图表插件的render/update函数中调用此函数，应该首先设置插件的asyncRender/asyncUpdate，
	 * 并在callback中调用chart.statusRendered(true)/chart.statusUpdated(true)，具体参考此文件顶部的注释。
	 * 
	 * @param name 地图名称
	 * @param callback 可选，加载并注册完成后的回调函数，格式为：function(name, map, jqXHR){ ... }，或者也可以是JQuery的ajax配置项：{...}
	 */
	chartBase.echartsLoadMap = function(name, callback)
	{
		var registerMap = function(name, map, jqXHR)
		{
			var contentType = (jqXHR.getResponseHeader("Content-Type") || "");
			
			//SVG地图
			if(/svg/i.test(contentType))
			{
				echarts.registerMap(name, {svg: map});
			}
			//其他都认为是GeoJSON地图
			else
			{
				echarts.registerMap(name, {geoJSON: map});
			}
		};
		
		if(callback == null)
			;
		else if($.isFunction(callback))
		{
			var originalCallback = callback;
			callback = function(name, map, jqXHR)
			{
				registerMap(name, map, jqXHR);
				originalCallback.call(this, name, map, jqXHR);
			};
		}
		//ajax配置项：{...}
		else
		{
			var settings = $.extend({}, callback);
			var originalCallback = settings.success;
			settings.success = function(map, textStatus, jqXHR)
			{
				registerMap(name, map, jqXHR);
				
				if(originalCallback)
					originalCallback.call(this, map, textStatus, jqXHR);
			};
			
			callback = settings;
		}
		
		this.loadMap(name, callback);
	};
	
	/**
	 * 图表事件支持函数：创建ECharts图表的事件对象。
	 * 
	 * @param eventType 事件类型
	 * @param echartsEventParams ECharts事件处理函数的参数对象
	 */
	chartBase.eventNewEcharts = function(eventType, echartsEventParams)
	{
		var event =
		{
			"type": eventType,
			"chart": this,
			"chartType": chartFactory.CHART_EVENT_CHART_TYPE_ECHARTS,
			"originalEvent": echartsEventParams
		};
		
		return event;
	};
	
	/**
	 * 图表事件支持函数：创建HTML图表的事件对象。
	 * 
	 * @param eventType 事件类型
	 * @param htmlEvent HTML事件对象
	 */
	chartBase.eventNewHtml = function(eventType, htmlEvent)
	{
		var event =
		{
			"type": eventType,
			"chart": this,
			"chartType": chartFactory.CHART_EVENT_CHART_TYPE_HTML,
			"originalEvent": htmlEvent
		};
		
		return event;
	};
	
	/**
	 * 图表事件支持函数：获取/设置图表事件的数据（chartEvent.data）。
	 * 
	 * 对于图表插件关联的图表渲染器，构建的图表事件数据应该以数据标记作为数据属性：
	 * { 数据标记名 : 数据值, ... }
	 * 使得图表事件数据的格式是固定的，便于事件处理函数读取。
	 * 
	 * @param chartEvent 图表事件对象，格式应为：{ ... }
	 * @param data 可选，要设置的数据，通常是绘制图表条目的数据，或由其转换而得，格式应为：
	 *             { ... }、[ { ... }, ... ]
	 * @returns 要获取的图表事件数据，未设置则返回null
	 */
	chartBase.eventData = function(chartEvent, data)
	{
		if(data === undefined)
			return chartEvent["data"];
		else
			chartEvent["data"] = data;
	};
	
	/**
	 * 图表事件支持函数：获取/设置图表事件数据（chartBase.eventData(chartEvent)返回值）对应的原始图表数据集索引（chartEvent.originalChartDataSetIndex）。
	 * 
	 * @param chartEvent 图表事件对象，格式应为：{ ... }
	 * @param originalChartDataSetIndex 可选，要设置的原始图表数据集索引，格式应为：
	 *                                  当图表事件数据是对象时：图表数据集索引数值、图表数据集索引数值数组
	 *                                  当图表事件数据是对象数组时：数组，其元素可能为图表数据集索引数值、图表数据集索引数值数组
	 *                                  其中，图表数据集索引数值允许为null，因为图表事件数据可能并非由图表结果数据构建
	 * @returns 要获取的原始图表数据集索引，未设置则返回null
	 */
	chartBase.eventOriginalChartDataSetIndex = function(chartEvent, originalChartDataSetIndex)
	{
		if(originalChartDataSetIndex === undefined)
			return chartEvent["originalChartDataSetIndex"];
		else
			chartEvent["originalChartDataSetIndex"] = originalChartDataSetIndex;
	};
	
	/**
	 * 图表事件支持函数：获取/设置图表事件数据（chartBase.eventData(chartEvent)返回值）对应的原始数据集结果数据索引（chartEvent.originalResultDataIndex）。
	 * 
	 * @param chartEvent 图表事件对象，格式应为：{ ... }
	 * @param originalResultDataIndex 可选，要设置的原始数据集结果数据索引，格式应为：
	 *                                与chartBase.eventOriginalChartDataSetIndex(chartEvent)返回值格式一致，
	 *                                只是每一个图表数据集索引数值可能对应一个数据集结果数据索引数值、也可能对应一个数据集结果数据索引数值数组
	 * @returns 要获取的原始数据集结果数据索引，未设置则返回null
	 */
	chartBase.eventOriginalResultDataIndex = function(chartEvent, originalResultDataIndex)
	{
		if(originalResultDataIndex === undefined)
			return chartEvent["originalResultDataIndex"];
		else
			chartEvent["originalResultDataIndex"] = originalResultDataIndex;
	};
	
	/**
	 * 图表事件支持函数：获取/设置图表事件数据（chartBase.eventData(chartEvent)返回值）对应的原始数据集结果数据（chartEvent.originalData）。
	 * 
	 * @param chartEvent 图表事件对象，格式应为：{ ... }
	 * @param originalData 可选，要设置的原始数据集结果数据，格式应为：
	 *                     与chartBase.eventOriginalResultDataIndex(chartEvent)返回值格式一致，
	 *                     只是每一个数据集结果数据索引数值对应一个数据集结果数据对象
	 * @returns 要获取的原始数据，未设置则返回null
	 */
	chartBase.eventOriginalData = function(chartEvent, originalData)
	{
		if(originalData === undefined)
			return chartEvent["originalData"];
		else
			chartEvent["originalData"] = originalData;
	};
	
	/**
	 * 图表事件支持函数：设置图表事件对象的原始图表数据集索引、原始数据、原始结果数据索引。
	 * 
	 * @param chartEvent 图表事件对象，格式应为：{ ... }
	 * @param originalInfo 图表数据对象、数组，或者原始信息对象、数组（格式参考：chartBase.originalInfo函数返回值），或者原始图表数据集索引数值（用于兼容旧版API）
	 * @param originalResultDataIndex 可选，当originalInfo是索引数值时的原始数据索引，格式可以是：数值、数值数组
	 */
	chartBase.eventOriginalInfo = function(chartEvent, originalInfo, originalResultDataIndex)
	{
		var ocdsi = null;
		var ordi = null;
		var odata = null;
		
		var updateResults = this.updateResults();
		
		if(originalInfo == null)
		{
		}
		else if(typeof(originalInfo) == "number")
		{
			ocdsi = originalInfo;
			ordi = originalResultDataIndex;
			
			odata = this.resultDataElement(this.resultAt(updateResults, ocdsi), ordi);
		}
		else
		{
			var isArray = $.isArray(originalInfo);
			
			if(!isArray)
				originalInfo = [ originalInfo ];
			
			ocdsi = [];
			ordi = [];
			odata = [];
			
			for(var i=0; i<originalInfo.length; i++)
			{
				//先认为是图表数据对象
				var myOi = this.originalInfo(originalInfo[i]);
				if(!myOi)
					myOi = originalInfo[i];
				
				var myOcdsi = (myOi ? myOi.chartDataSetIndex : null);
				var myOrdi = (myOi ? myOi.resultDataIndex : null);
				
				ocdsi[i] = myOcdsi;
				ordi[i] = myOrdi;
				
				if($.isArray(myOcdsi))
				{
					odata[i] = [];
					
					for(var j=0; j<myOcdsi.length; j++)
						odata[i][j] = this.resultDataElement(this.resultAt(updateResults, myOcdsi[j]), (myOrdi ? myOrdi[j] : null));
				}
				else
				{
					odata[i] = this.resultDataElement(this.resultAt(updateResults, myOcdsi), myOrdi);
				}
			}
			
			if(!isArray)
			{
				ocdsi = ocdsi[0];
				ordi = ordi[0];
				odata = odata[0];
			}
		}
		
		this.eventOriginalChartDataSetIndex(chartEvent, ocdsi);
		this.eventOriginalResultDataIndex(chartEvent, ordi);
		this.eventOriginalData(chartEvent, odata);
	};
	
	/**
	 * 获取/设置图表渲染选项。
	 * 
	 * 图表渲染器可在其render()中使用此函保存图表渲染选项，然后在其update()中获取渲染选项。
	 * 调用chart.inflateRenderOptions()后，会自动调用此函数设置图表渲染选项。
	 * 
	 * @param renderOptions 可选，要设置的渲染选项对象，通常由图表渲染器内部渲染选项、chart.options()合并而成，格式应为：{ ... }
	 * @returns 要获取的图表渲染选项，没有则返回null
	 */
	chartBase.renderOptions = function(renderOptions)
	{
		return chartFactory.extValueBuiltin(this, "renderOptions", renderOptions);
	};
	
	/**
	 * 填充指定图表渲染选项。
	 * 
	 * 此函数先将chart.options()高优先级深度合并至renderOptions，然后调用可选的beforeProcessHandler，
	 * 最后，如果renderOptions中有定义processRenderOptions函数（格式为：function(renderOptions, chart){ ... }），则调用它。
	 * 
	 * 此函数会自动调用chart.renderOptions()设置填充后的图表渲染选项。 
	 * 
	 * 图表渲染器应该在其render()中使用此函数构建图表渲染选项，然后使用它执行图表渲染逻辑，以符合图表API规范。
	 * 
	 * @param renderOptions 可选，待填充的渲染选项，通常由图表渲染器render函数内部生成，格式为：{ ... }，默认为空对象：{}
	 * @param beforeProcessHandler 可选，renderOptions.processRenderOptions调用前处理函数，
								   格式为：function(renderOptions, chart){ ... }, 默认为：undefined
	 * @returns renderOptions
	 */
	chartBase.inflateRenderOptions = function(renderOptions, beforeProcessHandler)
	{
		if(arguments.length == 1)
		{
			//(beforeProcessHandler)
			if($.isFunction(renderOptions))
			{
				beforeProcessHandler = renderOptions;
				renderOptions = undefined;
			}
		}
		
		if(renderOptions == null)
			renderOptions = {};
		
		$.extend(true, renderOptions, this.options());
		
		if(beforeProcessHandler != null)
			beforeProcessHandler(renderOptions, this);
		
		//最后调用processRenderOptions
		if(renderOptions.processRenderOptions)
			renderOptions.processRenderOptions(renderOptions, this);
		
		this.renderOptions(renderOptions);
		
		return renderOptions;
	};
	
	/**
	 * 填充指定图表更新选项。
	 * 
	 * 此函数先将renderOptions中与updateOptions的同名项高优先级深度合并至updateOptions，然后调用可选的beforeProcessHandler，
	 * 最后，如果renderOptions或者chart.renderOptions()中有定义processUpdateOptions函数（格式为：function(updateOptions, chart, results){ ... }），
	 * 则调用它们两个的其中一个（renderOptions优先）。
	 * 
	 * 图表渲染器应该在其update()中使用此函数构建图表更新选项，然后使用它执行图表更新逻辑，以符合图表API规范。
	 * 
	 * @param results 图表更新结果
	 * @param updateOptions 可选，待填充的更新选项，通常由图表渲染器update函数内部生成，格式为：{ ... }，默认为空对象：{}
	 * @param renderOptions 可选，图表的渲染选项，格式为：{ ... }，默认为：chart.renderOptions()
	 * @param beforeProcessHandler 可选，renderOptions.processUpdateOptions调用前处理函数，
								   格式为：function(updateOptions, chart, results){ ... }, 默认为：undefined
	 * @returns updateOptions
	 */
	chartBase.inflateUpdateOptions = function(results, updateOptions, renderOptions, beforeProcessHandler)
	{
		//(results)
		if(arguments.length == 1)
			;
		else if(arguments.length == 2)
		{
			//(results, beforeProcessHandler)
			if($.isFunction(updateOptions))
			{
				beforeProcessHandler = updateOptions;
				updateOptions = undefined;
				renderOptions = undefined;
			}
			//(results, updateOptions)
			else
				;
		}
		else if(arguments.length == 3)
		{
			//(results, updateOptions, beforeProcessHandler)
			if($.isFunction(renderOptions))
			{
				beforeProcessHandler = renderOptions;
				renderOptions = undefined;
			}
			//(results, updateOptions, renderOptions)
			else
				;
		}
		
		var chartRenderOptions = this.renderOptions();
		
		if(updateOptions == null)
			updateOptions = {};
		if(renderOptions == null)
			renderOptions = (chartRenderOptions || {});
		
		//提取renderOptions中的待合并项
		//这些待合并项应该比updateOptions有更高的优先级，因为它们包含由用户定义的有最高优先级的chart.options()
		var srcRenderOptions = {};
		for(var uop in updateOptions)
			srcRenderOptions[uop] = renderOptions[uop];
		
		// < @deprecated 兼容2.6.0版本的chart.optionsUpdate()
		// 待chart.optionsUpdate()移除后应改为：
		// $.extend(true, updateOptions, srcRenderOptions);
		$.extend(true, updateOptions, srcRenderOptions, this.optionsUpdate());
		// > @deprecated 兼容2.6.0版本的chart.optionsUpdate()
		
		if(beforeProcessHandler != null)
			beforeProcessHandler(updateOptions, this, results);
		
		//最后调用processUpdateOptions
		if(renderOptions.processUpdateOptions)
		{
			renderOptions.processUpdateOptions(updateOptions, this, results);
		}
		//renderOptions可能不是chartRenderOptions，此时要确保chartRenderOptions.processUpdateOptions被调用
		else if(chartRenderOptions && renderOptions !== chartRenderOptions
					&& chartRenderOptions.processUpdateOptions)
		{
			chartRenderOptions.processUpdateOptions(updateOptions, this, results);
		}
		
		return updateOptions;
	};
	
	/**
	 * 获取/设置指定数据对象的原始信息属性值，包括：图表ID、图表数据集索引、结果数据索引。
	 * 图表渲染器在构建用于渲染图表的内部数据对象时，应使用此函数设置其原始信息，以支持在后续的交互、事件处理中获取这些原始信息。
	 * 
	 * @param data 数据对象、数据对象数组，格式为：{ ... }、[ { ... }, ... ]，当是数组时，设置操作将为每个元素单独设置原始信息
	 * @param chartDataSetIndex 要设置的图表数据集索引数值、图表数据集对象（自动取其索引数值），或者它们的数组
	 * @param resultDataIndex 可选，要设置的结果数据索引，格式为：
	 *                        当chartDataSetIndex不是数组时：
	 *                        数值、数值数组
	 *                        当chartDataSetIndex是数组时：
	 *                        数值，表示chartDataSetIndex数组每个元素的结果数据索引都是此数值
	 *                        数组（元素可以是数值、数值数组），表示chartDataSetIndex数组每个元素的结果数据索引是此数组对应位置的元素
	 *                        默认值为：0
	 * @param autoIncrement 可选，当data是数组时：
	 *                      当chartDataSetIndex不是数组且resultDataIndex是数值时，设置时是否自动递增resultDataIndex；
	 *                      当chartDataSetIndex是数组且其元素对应位置的结果数据索引是数值时，是否自动递增这个结果数据索引是数值。
	 *                      默认值为：true
	 * @returns 要获取的原始信息属性值(可能为null），格式为：
	 *									{
	 *										//图表ID
	 *										chartId: "...",
	 *										//图表数据集索引数值、数值数组
	 *										chartDataSetIndex: ...,
	 *										//结果数据索引，格式为：
	 *                                      //当chartDataSetIndex不是数组时：
	 *                                      //数值、数值数组
	 *                                      //当chartDataSetIndex是数组时：
	 *                                      //数组（元素可能是数值、数值数组）
	 *										resultDataIndex: ...
	 *									}
	 *									当data是数组时，将返回此结构的数组
	 */
	chartBase.originalInfo = function(data, chartDataSetIndex, resultDataIndex, autoIncrement)
	{
		var pname = chartFactory._DATA_ORIGINAL_INFO_PROP_NAME;
		
		var isDataArray = $.isArray(data);
		
		//获取
		if(arguments.length == 1)
		{
			if(isDataArray)
			{
				var re = [];
				
				for(var i=0; i<data.length; i++)
					re.push(data[i][pname]);
				
				return re;
			}
			else
				return (data == null ? undefined : data[pname]);
		}
		//设置
		else
		{
			if(data == null)
				return;
			
			//(data, chartDataSetIndex, true)、(data, chartDataSetIndex, false)
			if(resultDataIndex === true || resultDataIndex === false)
			{
				autoIncrement = resultDataIndex;
				resultDataIndex = undefined;
			}
			
			resultDataIndex = (resultDataIndex === undefined ? 0 : resultDataIndex);
			
			var isCdsiArray = $.isArray(chartDataSetIndex);
			
			if(isCdsiArray)
			{
				var cdsiNew = [];
				
				for(var i=0; i<chartDataSetIndex.length; i++)
				{
					cdsiNew[i] = (chartDataSetIndex[i] != null && chartDataSetIndex[i].index !== undefined ?
									chartDataSetIndex[i].index : chartDataSetIndex[i]);
				}
				
				chartDataSetIndex = cdsiNew;
				
				if(!$.isArray(resultDataIndex))
				{
					var rdiNew = [];
					
					for(var i=0; i<chartDataSetIndex.length; i++)
						rdiNew[i] = resultDataIndex;
					
					resultDataIndex = rdiNew;
				}
			}
			else
			{
				chartDataSetIndex = (chartDataSetIndex != null && chartDataSetIndex.index !== undefined ?
										chartDataSetIndex.index : chartDataSetIndex);
			}
			
			if(isDataArray)
			{
				autoIncrement = (autoIncrement === undefined ? true : autoIncrement);
				var isRdiNumber = (typeof(resultDataIndex) == "number");
				
				var needAutoIncrementEle = (autoIncrement == true && $.isArray(resultDataIndex));
				if(needAutoIncrementEle == true)
				{
					needAutoIncrementEle = false;
					
					//任一元素是数值的话，才需要自增处理
					for(var i=0; i<resultDataIndex.length; i++)
					{
						if(typeof(resultDataIndex[i]) == "number")
						{
							needAutoIncrementEle = true;
							break;
						}
					}
				}
				
				for(var i=0; i<data.length; i++)
				{
					var originalInfo =
					{
						"chartId": this.id,
						"chartDataSetIndex": chartDataSetIndex
					};
					
					if(!autoIncrement)
					{
						originalInfo["resultDataIndex"] = resultDataIndex;
					}
					else
					{
						var resultDataIndexMy = resultDataIndex;
						
						if(isRdiNumber)
						{
							resultDataIndexMy = resultDataIndex + i;
						}
						else if(needAutoIncrementEle)
						{
							resultDataIndexMy = [];
							for(var j=0; j<resultDataIndex.length; j++)
							{
								resultDataIndexMy[j] = resultDataIndex[j];
								if(typeof(resultDataIndexMy[j]) == "number")
									resultDataIndexMy[j] = resultDataIndexMy[j] + i;
							}
						}
						
						originalInfo["resultDataIndex"] = resultDataIndexMy;
					}
					
					data[i][pname] = originalInfo;
				}
			}
			else
			{
				var originalInfo =
				{
					"chartId": this.id,
					"chartDataSetIndex": chartDataSetIndex,
					"resultDataIndex": resultDataIndex
				};
				
				data[pname] = originalInfo;
			}
		}
	};
	
	/**
	 * 调用指定图表事件处理函数。
	 * 图表渲染器在实现其on函数逻辑时，可以使用此函数。
	 * 
	 * @param eventHanlder 图表事件处理函数，格式为：function(chartEvent){ ... }
	 * @param chartEvent 传递给上述eventHanlder的图表事件参数
	 * @returns eventHanlder执行结果
	 */
	chartBase.callEventHandler = function(eventHanlder, chartEvent)
	{
		return eventHanlder.call(this, chartEvent);
	};
	
	/**
	 * 注册图表事件处理函数代理。
	 * 图表渲染器on函数的实现逻辑通常是：先构建适配底层组件的图表事件处理函数代理（handlerDelegation），
	 * 在代理中构建图表事件对象，然后调用图表事件处理函数（eventHanlder）。
	 * 此方法用于注册这些信息，使得在实现图表渲染器的off函数时，可以获取对应底层组件的图表事件处理函数代理，进而实现底层组件的解绑逻辑。
	 * 
	 * @param eventType 图表事件类型
	 * @param eventHanlder 图表事件处理函数，格式为：function(chartEvent){ ... }
	 * @param handlerDelegation 图表事件处理函数代理，通常是图表底层组件事件处理函数
	 * @returns 已注册的图表事件处理函数代理信息对象，格式为：{ eventType: "...", eventHanlder: ..., handlerDelegation: ... }
	 */
	chartBase.registerEventHandlerDelegation = function(eventType, eventHanlder, handlerDelegation)
	{
		var delegations = chartFactory.extValueBuiltin(this, "eventHandlerDelegations");
		if(delegations == null)
		{
			delegations = [];
			chartFactory.extValueBuiltin(this, "eventHandlerDelegations", delegations);
		}
		
		var di = { "eventType": eventType, "eventHanlder": eventHanlder, "handlerDelegation": handlerDelegation };
		delegations.push(di);
		
		return di;
	};
	
	/**
	 * 删除图表事件处理函数代理，并返回已删除的代理信息对象数组。
	 * 图表渲染器off函数的实现逻辑通常是：使用此方法移除由registerEventHandlerDelegation注册的图表事件处理函数代理信息对象，
	 * 然后调用底层组件的事件解绑函数，解绑代理信息对象的handlerDelegation。
	 * 
	 * @param eventType 图表事件类型
	 * @param eventHanlder 可选，图表事件处理函数，格式为：function(chartEvent){ ... }，当为undefined时，表示全部
	 * @param eachCallback 可选，对于删除的每个代理信息对象，执行此回调函数（通常包含底层组件的事件解绑逻辑），格式为：function(eventType, eventHandler, handlerDelegation){ ... }
	 * @param returns 匹配给定图表事件类型、图表事件处理函数（可选）的代理信息对象数组，格式为：
	 *						[ { eventType: "...", eventHanlder: ..., handlerDelegation: ... }, ... ]
	 */
	chartBase.removeEventHandlerDelegation = function(eventType, eventHanlder, eachCallback)
	{
		var re = [];
		
		var delegations = chartFactory.extValueBuiltin(this, "eventHandlerDelegations");
		if(delegations == null)
			return re;
		
		var delegationsNew = [];
		
		for(var i=0; i<delegations.length; i++)
		{
			var d = delegations[i];
			
			var remove = (d.eventType == eventType);
			remove = (remove ? (eventHanlder === undefined || d.eventHanlder == eventHanlder) : false);
			
			if(remove)
				re.push(d);
			else
				delegationsNew.push(d);
		}
		
		chartFactory.extValueBuiltin(this, "eventHandlerDelegations", delegationsNew);
		
		if(eachCallback != null)
		{
			for(var i=0; i<re.length; i++)
			{
				eachCallback.call(re[i], re[i].eventType, re[i].eventHandler, re[i].handlerDelegation);
			}
		}
		
		return re;
	};
	
	/**
	 * ECharts图表支持函数：解绑指定图表事件处理函数。
	 * ECharts相关的图表渲染器可以在其off函数中调用此函数，以实现底层事件解绑功能。
	 * 
	 * @param eventType 图表事件类型
	 * @param eventHanlder 可选，图表事件处理函数，格式为：function(chartEvent){ ... }，不设置则解绑所有此类型的图表事件处理函数
	 * @returns 同chartBase.removeEventHandlerDelegation返回值
	 */
	chartBase.echartsOffEventHandler = function(eventType, eventHanlder)
	{
		var internal = this.internal();
		
		return this.removeEventHandlerDelegation(eventType, eventHanlder, function(et, eh, ehd)
		{
			if(internal)
				internal.off(et, ehd);
		});
	};
	
	/**
	 * 获取图表主题指定渐变因子的颜色。
	 * 这个颜色是图表主题的实际背景色（actualBackgroundColor）与前景色（color）之间的某个颜色。
	 * 
	 * 图表渲染器在绘制图表时，可以使用此函数获取的颜色来设置图表配色。
	 * 
	 * @param factor 可选，渐变因子，0-1之间的小数，其中0表示最接近实际背景色的颜色、1表示最接近前景色的颜色
	 * @param theme 可选，用于获取颜色的主题，默认为：chart.theme()
	 * @returns 与factor匹配的颜色字符串，格式类似："#FFFFFF"，如果未设置factor，将返回一个包含所有渐变颜色的数组
	 */
	chartBase.gradualColor = function(factor, theme)
	{
		//gradualColor(theme)
		if(arguments.length == 1 && typeof(factor) != "number")
		{
			theme = factor;
			factor = undefined;
		}
		theme = (theme == null ? this.theme() : theme);
		
		return chartFactory.gradualColor(theme, factor);
	};
	
	/**
	 * 获取数据集结果数据指定索引的元素。
	 * 
	 * @param result 数据集结果对象
	 * @param index 索引数值、数值数组
	 * @return 数据对象、据对象数组，当result、index为null时，将返回null
	 */
	chartBase.resultDataElement = function(result, index)
	{
		if(result == null || result.data == null || index == null)
			return undefined;
		
		var datas = this.resultDatas(result);
		
		if(!$.isArray(index))
			return datas[index];
		else
		{
			var re = [];
			
			for(var i=0; i<index.length; i++)
				re.push(datas[index[i]]);
			
			return re;
		}
	};
	
	/**
	 * 获取主题对应的CSS类名。
	 * 这个CSS类名是全局唯一的，可添加至HTML元素的"class"属性。
	 * 
	 * 图表在渲染前会自动为chart.element()图表元素添加chart.themeStyleName()返回的CSS类，
	 * 使得通过chart.themeStyleSheet(name, css)函数创建的样式表可自动应用于图表元素或子元素。
	 * 
	 * @param theme 可选，主题对象，格式为：{ ... }，默认为：chart.theme()
	 * @returns CSS类名，不会为null
	 */
	chartBase.themeStyleName = function(theme)
	{
		theme = (theme == null ? this.theme() : theme);
		return chartFactory.themeStyleName(theme);
	};
	
	/**
	 * 判断/设置与指定主题和名称关联的CSS样式表，详细参考chartFactory.themeStyleSheet()函数说明。
	 * 
	 * 使用方式：
	 * 判断与此图表主题和名称关联的CSS样式表是否已设置（返回true或者false）：
	 * chart.themeStyleSheet(name)
	 * 如果未设置过，则设置此图表主题和名称关联的CSS样式表（返回chart.themeStyleName()函数结果）：
	 * chart.themeStyleSheet(name, css)
	 * 强制设置此图表主题和名称关联的CSS样式表（返回chart.themeStyleName()函数结果）：
	 * chart.themeStyleSheet(name, css, true)
	 * 判断与指定图表主题和名称关联的CSS样式表是否已设置（返回true或者false）：
	 * chart.themeStyleSheet(theme, name)
	 * 如果未设置过，则设置指定图表主题和名称关联的CSS样式表（返回chart.themeStyleName(theme)函数结果）：
	 * chart.themeStyleSheet(theme, name, css)
	 * 强制设置指定图表主题和名称关联的CSS样式表（返回chart.themeStyleName(theme)函数结果）：
	 * chart.themeStyleSheet(theme, name, css, true)
	 * 
	 * 图表渲染器在绘制HTML图表时，可以使用此函数设置与此图表主题对应的子元素CSS样式表，例如：
	 * 假设有用于显示数据数目的HTML图表渲染器，它将绘制如下HTML图表：
	 * <div dg-chart-widget="...">
	 *   <span class="result-data-count">数目</span>
	 * </div>
	 * 可采用如下方式设置其CSS样式表：
	 * {
	 *   render: function(chart)
	 *   {
	 *     $("<span class='result-data-count'>").appendTo(chart.elementJquery());
	 *     //使用相同图表主题的多个图表将仅创建一个CSS样式表
	 *     chart.themeStyleSheet("myChartTextStyle", function()
	 *     {
	 *       return { name: " .result-data-count", value: { color: chart.theme().color } };
	 *     });
	 *   },
	 *   update: function(chart, results)
	 *   {
	 *     $(".result-data-count", chart.elementJquery()).text(chart.resultDatasFirst(results).length);
	 *   }
	 * }
	 * 
	 * @param theme 可选，参考chartFactory.themeStyleSheet()的theme参数，默认为：chart.theme()
	 * @param name 参考chartFactory.themeStyleSheet()的name参数
	 * @param css 参考chartFactory.themeStyleSheet()的css参数
	 * @param force 参考chartFactory.themeStyleSheet()的force参数
	 * 
	 * @returns 参考chartFactory.themeStyleSheet()的返回值
	 */
	chartBase.themeStyleSheet = function(theme, name, css, force)
	{
		//(name)
		if(arguments.length == 1)
		{
			name = theme;
			theme = this.theme();
		}
		else if(arguments.length > 1)
		{
			//(name, ...)
			if(typeof(theme) == "string")
			{
				force = css;
				css = name;
				name = theme;
				theme = this.theme();
			}
			//(theme, ...)
			else
				;
		}
		
		return chartFactory.themeStyleSheet(theme, name, css, force);
	};
	
	/**
	 * 获取/设置HTML元素的CSS样式字符串（元素的style属性）。
	 * 具体参考chartFactory.elementStyle()函数。
	 */
	chartBase.elementStyle = function(element, css)
	{
		return chartFactory.elementStyle(element, css);
	};
	
	/**
	 * 拼接CSS样式字符串。
	 * 具体参考chartFactory.styleString()函数。
	 */
	chartBase.styleString = function(css)
	{
		var cssArray = [];
		
		for(var i=0; i<arguments.length; i++)
		{
			var cssi = arguments[i];
			
			if(!cssi)
				continue;
			
			cssArray = cssArray.concat(cssi);
		}
		
		return chartFactory.styleString(cssArray);
	};
	
	//-------------
	// < 已弃用函数 start
	//-------------
	
	// < @deprecated 兼容2.7.0版本的API，将在未来版本移除，已被chartBase.registerEventHandlerDelegation()取代
	/**
	 * 图表事件支持函数：绑定图表事件处理函数代理。
	 * 注意：此函数在图表渲染完成后才可调用。
	 * 
	 * 图表事件处理通常由内部组件的事件处理函数代理（比如ECharts），并在代理函数中调用图表事件处理函数。
	 * 
	 * @param eventType
	 * @param eventHanlder 图表事件处理函数：function(chartEvent){ ... }
	 * @param eventHandlerDelegation 图表事件处理函数代理，负责构建chartEvent对象并调用eventHanlder
	 * @param delegationBinder 代理事件绑定器，格式为：{ bind: function(chart, eventType, eventHandlerDelegation){ ... } }
	 */
	chartBase.eventBindHandlerDelegation = function(eventType, eventHanlder,
			eventHandlerDelegation, delegationBinder)
	{
		this._assertActive();
		
		var delegations = chartFactory.extValueBuiltin(this, "eventHandlerDelegationsDeprecated");
		if(delegations == null)
		{
			delegations = [];
			chartFactory.extValueBuiltin(this, "eventHandlerDelegationsDeprecated", delegations);
		}
		
		delegationBinder.bind(this, eventType, eventHandlerDelegation);
		
		delegations.push({ eventType: eventType , eventHanlder: eventHanlder, eventHandlerDelegation: eventHandlerDelegation });
	};
	// > @deprecated 兼容2.7.0版本的API，将在未来版本移除，已被chartBase.registerEventHandlerDelegation()取代
	
	// < @deprecated 兼容2.7.0版本的API，将在未来版本移除，已被chartBase.removeEventHandlerDelegation()取代
	/**
	 * 图表事件支持函数：为图表解绑事件处理函数代理。
	 * 注意：此函数在图表渲染完成后才可调用。
	 * 
	 * @param eventType 事件类型
	 * @param eventHanlder 可选，要解绑的图表事件处理函数，不设置则解除所有指定事件类型的处理函数
	 * @param delegationUnbinder 代理事件解绑器，格式为：{ unbind: function(chart, eventType, eventHandlerDelegation){ ... } }
	 */
	chartBase.eventUnbindHandlerDelegation = function(eventType, eventHanlder, delegationUnbinder)
	{
		this._assertActive();
		
		if(delegationUnbinder == undefined)
		{
			delegationUnbinder = eventHanlder;
			eventHanlder = undefined;
		}
		
		var delegations = chartFactory.extValueBuiltin(this, "eventHandlerDelegationsDeprecated");
		
		if(delegations == null)
			return;
		
		var unbindCount = 0;
		
		for(var i=0; i<delegations.length; i++)
		{
			var eh = delegations[i];
			var unbind = false;
			
			if(eventType == eh.eventType)
				unbind = (eventHanlder == undefined || (eh.eventHanlder == eventHanlder));
			
			if(unbind)
			{
				delegationUnbinder.unbind(this, eventType, eh.eventHandlerDelegation);
				delegations[i] = null;
				unbindCount++;
			}
		}
		
		if(unbindCount > 0)
		{
			var delegationsTmp = [];
			for(var i=0; i<delegations.length; i++)
			{
				if(delegations[i] != null)
					delegationsTmp.push(delegations[i]);
			}
			
			chartFactory.extValueBuiltin(this, "eventHandlerDelegationsDeprecated", delegationsTmp);
		}
	};
	// > @deprecated 兼容2.7.0版本的API，将在未来版本移除，已被chartBase.removeEventHandlerDelegation()取代
	
	// < @deprecated 兼容2.6.0版本的API，将在未来版本移除，已被chartBase.internal()取代
	/**
	 * ECharts图表支持函数：获取/设置图表的ECharts实例对象。
	 * 
	 * @param instance 可选，要设置的ECharts实例，不设置则执行获取操作
	 */
	chartBase.echartsInstance = function(instance)
	{
		return this.internal(instance);
	};
	// > @deprecated 兼容2.6.0版本的API，将在未来版本移除，已被chartBase.internal()取代
	
	// < @deprecated 兼容2.6.0版本的API，将在未来版本移除，已被renderOptions.processUpdateOptions取代（参考chart.inflateUpdateOptions()函数）
	/**
	 * 获取/设置图表更新时的图表选项，格式为： { ... }
	 * 当希望根据图表更新数据动态自定义图表选项时，可以在图表监听器的onUpdate函数中调用此函数设置更新图表选项。
	 * 
	 * 图表渲染器实现相关：
	 * 图表渲染器应使用此函数获取并应用更新图表选项（在其update函数中），另参考chart.inflateUpdateOptions()。
	 * 
	 * @param options 可选，要设置的图表选项，没有则执行获取操作
	 */
	chartBase.optionsUpdate = function(options)
	{
		return chartFactory.extValueBuiltin(this, "optionsUpdate", options);
	};
	// > @deprecated 兼容2.6.0版本的API，将在未来版本移除，已被renderOptions.processUpdateOptions取代（参考chart.inflateUpdateOptions()函数）
	
	// < @deprecated 兼容2.4.0版本的API，将在未来版本移除，已被chartBase.updateResults取代
	/**
	 * 获取用于此次更新图表的结果数据，没有则返回null。
	 */
	chartBase.getUpdateResults = function()
	{
		return this.updateResults();
	};
	// > @deprecated 兼容2.4.0版本的API，将在未来版本移除，已被chartBase.updateResults取代
	
	// < @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被chartBase.renderer取代
	/**
	 * 获取/设置自定义图表渲染器。
	 * 
	 * @param customChartRenderer 可选，要设置的自定义图表渲染器，自定义图表渲染器允许仅定义要重写的内置图表插件渲染器函数
	 */
	chartBase.customChartRenderer = function(customChartRenderer)
	{
		return this.renderer(customChartRenderer);
	};
	// > @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被chartBase.renderer取代
	
	// < @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被chartBase.chartDataSets取代
	/**
	 * 获取所有图表数据集对象数组。
	 */
	chartBase.chartDataSetsNonNull = function()
	{
		return (this.chartDataSets || []);
	};
	// > @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被chartBase.chartDataSets取代
	
	// < @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被chartBase.name取代
	/**
	 * 获取图表名称。
	 */
	chartBase.nameNonNull = function()
	{
		return (this.name || "");
	};
	// > @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被chartBase.name取代
	
	// < @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被chartBase.updateInterval取代
	/**
	 * 获取图表的更新间隔。
	 */
	chartBase.updateIntervalNonNull = function()
	{
		if(this.updateInterval != null)
			return this.updateInterval;
		
		return -1;
	},
	// > @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被chartBase.updateInterval取代
	
	// < @deprecated 兼容1.8.1版本的API，将在未来版本移除，已被chartBase.dataSetParamValues取代
	/**
	 * 获取指定图表数据集参数值对象。
	 */
	chartBase.getDataSetParamValues = function(chartDataSet)
	{
		return this.dataSetParamValues(chartDataSet);
	};
	// > @deprecated 兼容1.8.1版本的API，将在未来版本移除，已被chartBase.dataSetParamValues取代
	
	// < @deprecated 兼容1.8.1版本的API，将在未来版本移除，已被chartBase.dataSetParamValues取代
	/**
	 * 设置指定图表数据集多个参数值。
	 */
	chartBase.setDataSetParamValues = function(chartDataSet, paramValues)
	{
		this.dataSetParamValues(chartDataSet, paramValues);
	};
	// > @deprecated 兼容1.8.1版本的API，将在未来版本移除，已被chartBase.dataSetParamValues取代
	
	//-------------
	// > 已弃用函数 end
	//-------------
	
	//----------------------------------------
	// chartBase end
	//----------------------------------------
	
	/**
	 * 获取指定主题对象对应的CSS类名。
	 * 这个CSS类名是全局唯一的，可添加至HTML元素的"class"属性。
	 * 
	 * @param theme 主题对象，格式为：{ ... }
	 * @returns CSS类名，不会为null
	 */
	chartFactory.themeStyleName = function(theme)
	{
		var pn = chartFactory.builtinPropName("StyleName");
		var sn = theme[pn];
		
		if(!sn)
			sn = (theme[pn] = chartFactory.nextElementId());
		
		return sn;
	};
	
	/**
	 * 判断/设置与指定主题和名称关联的CSS样式表。
	 * 对于设置操作，最终生成的样式表都会添加chartFactory.themeStyleName(theme)CSS类名选择器前缀，
	 * 确保样式表只会影响添加了chartFactory.themeStyleName(theme)样式类的HTML元素。
	 * 
	 * 同一主题和名称的CSS样式表，通常仅需创建一次，因此，当需要为某个HTML元素应用与主题相关的样式表时，通常使用方式如下：
	 * 
	 * var styleName = chartFactory.themeStyleSheet(theme, "myName", function(){ return CSS样式表对象、数组; });
	 * $(element).addClass(styleName);
	 * 
	 * 或者
	 * 
	 * if(!chartFactory.themeStyleSheet(theme, "myName"))
	 *   $(element).addClass(chartFactory.themeStyleSheet(theme, "myName", CSS样式表对象、数组));
	 * 
	 * @param theme 主题对象，格式为：{ ... } 
	 * @param name 名称
	 * @param css 可选，要设置的CSS，格式为：
	 * 					function(){ return CSS样式表对象、[ CSS样式表对象, ... ] }
	 * 					或者
	 * 					CSS样式表对象
	 * 					或者
	 * 					[ CSS样式表对象, ... ]
	 * 					其中，CSS样式表对象格式为：
	 * 					{
	 * 					  //CSS选择器，例如：" .success"、".success"、" .error"、[ ".success", " .error" ]
	 * 					  //注意：前面加空格表示子元素、不加则表示元素本身
	 * 					  name: "..."、["...", ...],
	 * 					  //CSS属性对象、CSS属性字符串，例如：
	 *                    //{ "color": "red", "background-color": "blue", borderColor: "red" }、
	 *                    //"color:red;background-color:blue;"
	 * 					  value: { CSS属性名 : CSS属性值, ... }、"..."
	 * 					}
	 * @param force 可选，当指定了css时，是否强制执行设置，true 强制设置；false 只有name对应的样式表不存在时才设置，默认值为：false
	 * @returns 判断操作：true 已设置过；false 未设置过；设置操作：theme主题对应的CSS类名，即chartFactory.themeStyleName(theme)的返回值
	 */
	chartFactory.themeStyleSheet = function(theme, name, css, force)
	{
		var infoMap = theme[chartFactory._KEY_THEME_STYLE_SHEET_INFO];
		if(infoMap == null)
			infoMap = (theme[chartFactory._KEY_THEME_STYLE_SHEET_INFO] = {});
		
		var info = infoMap[name];
		
		if(css === undefined)
			return (info != null);
		
		var styleName = chartFactory.themeStyleName(theme);
		
		if(info && (force != true))
			return styleName;
		
		if(info == null)
			info = (infoMap[name] = { styleId: chartFactory.nextElementId() });
		
		var cssText = "";
		
		if($.isFunction(css))
			css = css();
		
		if(!$.isArray(css))
			css = [ css ];
		
		var styleNameSelector = "." + styleName;
		
		for(var i=0; i<css.length; i++)
		{
			var cssName = css[i].name;
			var cssValue = css[i].value;
			
			if(cssName == null)
				continue;
			
			if(!$.isArray(cssName))
				cssName = [ cssName ];
			
			for(var j=0; j<cssName.length; j++)
			{
				cssText += styleNameSelector + cssName[j];
				
				if(j < (cssName.length - 1))
					cssText += ",\n";
			}
			
			cssText += "{\n";
			cssText += chartFactory.styleString(cssValue);
			cssText += "\n}\n";
		}
		
		chartFactory.styleSheetText(info.styleId, cssText);
		
		return styleName;
	};
	
	/**
	 * 获取/设置HTML元素的CSS样式字符串（元素的style属性）。
	 * 
	 * 使用方式：
	 * chartFactory.elementStyle(element)
	 * chartFactory.elementStyle(element, "color:red;font-size:1.5em")
	 * chartFactory.elementStyle(element, {border:"1px solid red"}, "color:red;font-size:1.5em")
	 * chartFactory.elementStyle(element, "color:red;font-size:1.5em", {border:"1px solid red"}, "background:blue")
	 * chartFactory.elementStyle(element, ["color:red;font-size:1.5em", {border:"1px solid red"}], "background:blue")
	 * 
	 * @param element HTML元素、Jquery对象
	 * @param css 可选，要设置的CSS样式，格式为：同chartBase.styleString()函数参数
	 * @return 要获取的CSS样式字符串
	 */
	chartFactory.elementStyle = function(element, css)
	{
		element = $(element);
		
		if(css === undefined)
			return element.attr("style");
		
		var cssArray = [];
		
		for(var i=1; i<arguments.length; i++)
		{
			var cssi = arguments[i];
			
			if(!cssi)
				continue;
			
			cssArray = cssArray.concat(cssi);
		}
		
		var cssText = chartFactory.styleString(cssArray);
		
		element.attr("style", cssText);
	};
	
	/**
	 * 拼接CSS样式字符串。
	 * 
	 * 使用方式：
	 * chartFactory.styleString({color:"red", border:"1px solid red"})
	 * chartFactory.styleString({border:"1px solid red", padding:"1em 1em"}, "color:red;font-size:1.5em")
	 * chartFactory.styleString("color:red;font-size:1.5em", {border:"1px solid red", padding:"1em 1em"}, "background:blue")
	 * chartFactory.styleString(["color:red;font-size:1.5em", {border:"1px solid red", padding:"1em 1em"}], "background:blue")
	 * 
	 * @param css 要拼接的CSS样式，格式为：
	 *            字符串，例如："color:red;font-size:1.5em"
	 *            CSS属性对象，例如：{ color: "...", backgroundColor: "...", "font-size": "...", ...  }，
	 *            不合法的属性名将被转换为合法属性名，比如："backgroundColor"将被转换为"background-color"，另外，非字符串、数值、布尔型的属性值将被忽略
	 *            数组，元素可以是字符串、CSS属性对象
	 *            或者是上述格式的变长参数
	 * @return 拼接后的CSS样式字符串，例如："color:red;background-color:red;font-size:1px;"
	 */
	chartFactory.styleString = function(css)
	{
		var cssText = "";
		
		var cssArray = [];
		
		for(var i=0; i<arguments.length; i++)
		{
			var cssi = arguments[i];
			
			if(!cssi)
				continue;
			
			cssArray = cssArray.concat(cssi);
		}
		
		for(var i=0; i<cssArray.length; i++)
		{
			var cssi = cssArray[i];
			var cssiText = "";
			
			if(!cssi)
				continue;
				
			if(typeof(cssi) == "string")
				cssiText = cssi;
			else
			{
				for(var name in cssi)
				{
					var value = cssi[name];
					var valueType = typeof(value);
					
					if(valueType == "string" || valueType == "number" || valueType == "boolean")
					{
						name = chartFactory.toLegalStyleName(name);
						cssiText += name + ":" + value + ";";
					}
				}
			}
			
			if(cssiText && cssText && cssText.charAt(cssText.length - 1) != ";")
				cssText += ";" + cssiText;
			else
				cssText += cssiText;
		}
		
		return cssText;
	};
	
	/**
	 * 获取内置属性名（添加内置前缀）。
	 * 内置属性名以'_'开头。
	 */
	chartFactory.builtinPropName = function(name)
	{
		return chartFactory._BUILT_IN_NAME_UNDERSCORE_PREFIX + name;
	};
	
	/**
	 * 获取/设置图表的内置扩展属性值。
	 * chart.extValue()是允许用户级使用的，此函数应用于内置设置/获取操作，可避免属性名冲突。
	 * 
	 * @param chart 图表对象
	 * @param name 扩展属性名
	 * @param value 可选，要设置的扩展属性值，不设置则执行获取操作
	 */
	chartFactory.extValueBuiltin = function(chart, name, value)
	{
		name = chartFactory.builtinPropName(name);
		return chart.extValue(name, value);
	};
	
	/**
	 * 获取/设置渲染上下文的属性值。
	 * 
	 * @param renderContext
	 * @param attrName
	 * @param attrValue 要设置的属性值，可选，不设置则执行获取操作
	 */
	chartFactory.renderContextAttr = function(renderContext, attrName, attrValue)
	{
		if(attrValue === undefined)
			return renderContext.attributes[attrName];
		else
			return renderContext.attributes[attrName] = attrValue;
	};
	
	/**
	 * 获取渲染上下文中的WebContext对象。
	 * 
	 * @param renderContext
	 */
	chartFactory.renderContextAttrWebContext = function(renderContext)
	{
		return chartFactory.renderContextAttr(renderContext, chartFactory.renderContextAttrs.webContext);
	};
	
	/**
	 * 获取渲染上下文中的ChartTheme对象。
	 * 
	 * @param renderContext
	 */
	chartFactory.renderContextAttrChartTheme = function(renderContext)
	{
		return chartFactory.renderContextAttr(renderContext, chartFactory.renderContextAttrs.chartTheme);
	};
	
	/**
	 * 将给定URL转换为web上下文路径URL。
	 * 
	 * @param webContext web上下文
	 * @param url 待转换的URL
	 */
	chartFactory.toWebContextPathURL = function(webContext, url)
	{
		var contextPath = webContext.contextPath;
		
		if(url.indexOf("/") == 0)
			url = contextPath + url;
		
		return url;
	};
	
	/**
	 * 获取/设置HTML元素上的图表部件ID（"dg-chart-widget"属性值）。
	 * 
	 * @param element HTML元素、Jquery对象
	 * @param widgetId 选填参数，要设置的图表部件ID，不设置则执行获取操作
	 */
	chartFactory.elementWidgetId = function(element, widgetId)
	{
		element = $(element);
		
		if(widgetId === undefined)
		{
			return element.attr(chartFactory.elementAttrConst.WIDGET);
		}
		else
		{
			element.attr(chartFactory.elementAttrConst.WIDGET, widgetId);
		}
	};
	
	/** HTML元素上已渲染的图表对象KEY */
	chartFactory._KEY_ELEMENT_RENDERED_CHART = chartFactory._BUILT_IN_NAME_UNDERSCORE_PREFIX + "RenderedChart";
	
	/**
	 * 获取当前在指定HTML元素上渲染的图表对象，返回null表示元素上并未渲染图表。
	 * 
	 * @param element HTML元素、HTML元素ID、Jquery对象
	 */
	chartFactory.renderedChart = function(element)
	{
		if(typeof(element) == "string")
			element = "#" + element;
		
		return $(element).data(chartFactory._KEY_ELEMENT_RENDERED_CHART);
	};
	
	/** 生成元素ID用的前缀 */
	chartFactory._ELEMENT_ID_PREFIX = chartFactory._BUILT_IN_NAME_PART + new Number(new Date().getTime()).toString(16);
	
	/**
	 * 执行JS代码。
	 * 
	 * @param str JS代码
	 * @param defaultValue 默认返回值，可选，默认为：undefined
	 */
	chartFactory.evalSilently = function(str, defaultValue)
	{
		var re = undefined;
		
		try
		{
			re = Function("return ("+str+");")();
		}
		catch(e)
		{
			chartFactory.logException(e);
		}
		
		return (re || defaultValue);
	};
	
	/**
	 * 将指定名称转换为合法的CSS样式属性名
	 * 例如："backgroundColor" 将被转换为 "background-color"
	 */
	chartFactory.toLegalStyleName = function(name)
	{
		var re = "";
		
		for(var i=0; i<name.length; i++)
		{
			var c = name.charAt(i);
			
			if(c >= 'A' && c <= 'Z')
			{
				re += "-";
				re += c.toLowerCase();
			}
			else
				re += c;
		}
		
		return re;
	};
	
	chartFactory._KEY_GRADUAL_COLORS = chartFactory._BUILT_IN_NAME_UNDERSCORE_PREFIX + "GradualColors";
	
	/**
	 * 获取主题从背景色（actualBackgroundColor）到前景色（color）之间的渐变因子对应的颜色。
	 * 这个颜色是实际背景色（actualBackgroundColor）与前景色（color）之间的某个颜色。
	 * 
	 * @param theme 主题对象，格式为：{ color: "...", actualBackgroundColor: "..." }
	 * @param factor 可选，渐变因子，0-1之间的小数，其中0表示最接近实际背景色的颜色、1表示最接近前景色的颜色
	 * @returns 与factor匹配的颜色字符串，格式类似："#FFFFFF"，如果未设置factor，将返回一个包含所有渐变颜色的数组
	 */
	chartFactory.gradualColor = function(theme, factor)
	{
		var gcs = theme[chartFactory._KEY_GRADUAL_COLORS];
		
		if(!gcs || gcs.length == 0)
		{
			gcs = this.evalGradualColors(theme.actualBackgroundColor, theme.color, (theme.gradient || 10));
			theme[chartFactory._KEY_GRADUAL_COLORS] = gcs;
		}
		
		if(factor == null)
			return gcs;
		else
		{
			var index = parseInt((gcs.length-1) * factor);
			
			if(index == 0 && factor > 0)
				index = 1;
			
			if(index == gcs.length - 1 && factor < 1)
				index == gcs.length - 2;
			
			return gcs[index];
		}
	};
	
	/**
	 * 计算起始颜色和终止颜色之间的渐变颜色数组，数组中不包含起始颜色、也不包含结束颜色。
	 * 
	 * @param start 起始颜色
	 * @param end 终止颜色
	 * @param count 要计算的渐变颜色数目
	 * @param rgb true 返回"rgb(...)"格式；fasle 返回"#FFFFFF"格式，默认为false
	 * @returns 渐变颜色数组
	 */
	chartFactory.evalGradualColors = function(start, end, count, rgb)
	{
		var colors = [];
		
		start = this.parseColor(start);
		end = this.parseColor(end);
		
		count = count + 1;
		
		for(var i=1; i<count; i++)
		{
			var color = {};
			
			color.r = parseInt(start.r + (end.r - start.r)/count*i);
			color.g = parseInt(start.g + (end.g - start.g)/count*i);
			color.b = parseInt(start.b + (end.b - start.b)/count*i);
			
			if(rgb)
				color = "rgb("+color.r+","+color.g+","+color.b+")";
			else
			{
				var r = new Number(color.r).toString(16);
				var g = new Number(color.g).toString(16);
				var b = new Number(color.b).toString(16);
				
				color = "#" + (r.length == 1 ? "0"+r : r)
							 + (g.length == 1 ? "0"+g : g)
							  + (b.length == 1 ? "0"+b : b);
			}
			
			colors.push(color);
		}
		
		return colors;
	};
	
	/**
	 * 解析颜色对象。
	 * 将颜色字符串解析为{r: number, g: number, b: number}格式的对象。
	 * 
	 * @param color 颜色字符串，格式为："#FFF"、"#FFFFFF"、"rgb(255,255,255)"
	 */
	chartFactory.parseColor = function(color)
	{
		var re = {r: 0, g: 0, b: 0};
		
		if(!color)
			return re;
		
		//是颜色名称，则通过元素css函数转换
		if((color.charAt(0) != '#') && (color.indexOf("(") < 0))
		{
			var elementId = chartFactory._ELEMENT_ID_PREFIX +"ForConvertColor";
			
			var $colorEle = $("#"+elementId);
			if($colorEle.length == 0)
				$colorEle = $("<div id='"+elementId+"' style='display:none;position:absolute;left:0;bottom:0;width:0;height:0;z-index:-999;'></div>")
								.appendTo(document.body);
			
			$colorEle.css("color", color);
			color = $colorEle.css("color");
		}
		
		// #FFF、#FFFFFF
		if(color.charAt(0) == '#')
		{
			color = color.substring(1);
			
			if(color.length == 3)
				color = color + color;
			
			if(color.length >= 2)
				re.r = parseInt(color.substr(0, 2), 16);
			if(color.length >= 4)
				re.g = parseInt(color.substr(2, 2), 16);
			if(color.length >= 6)
				re.b = parseInt(color.substr(4, 2), 16);
		}
		// rgb()
		else
		{
			var si = color.indexOf("(");
			var ei = (si >= 0 ? color.indexOf(")", si+1) : -1);
			
			if(ei > si)
			{
				color = color.substring(si+1, ei).split(",");
				
				if(color.length >= 1)
					re.r = parseInt(color[0]);
				if(color.length >= 2)
					re.g = parseInt(color[1]);
				if(color.length >= 3)
					re.b = parseInt(color[2]);
			}
		}
		
		return re;
	};
	
	/**
	 * 设置指定ID的样式表css文本。
	 * 如果样式表不存在，将会自动创建，且会插入<head>中的靠前位置，确保其css效果优先级低于用户定义的css。
	 *
	 * @param styleId 样式表元素ID
	 * @param cssText css文本内容
	 */
	chartFactory.styleSheetText = function(styleId, cssText)
	{
		var $style = $("#" + styleId);
		
		if($style.length > 0)
		{
			$style.text(cssText);
			return;
		}
		
		$style = $("<style />").attr("id", styleId)
			.attr("dg-generated-style", "true").attr("type", "text/css").text(cssText);
		
		var $head = $("head:first");
		
		var $lastGenStyle = $("style[dg-generated-style]:last", $head);
		
		//后插入的优先级应高于先插入的
		if($lastGenStyle.length > 0)
		{
			$lastGenStyle.after($style);
			return;
		}
		
		var $lastImport = $("[dg-import-name]:last", $head);
		
		//优先级应高于导入的资源
		if($lastImport.length > 0)
		{
			$lastImport.after($style);
			return;
		}
		
		var $lastLink = $("link:last", $head);
		
		//优先级应高于link的css
		if($lastLink.length > 0)
		{
			$lastLink.after($style);
			return;
		}
		
		$head.prepend($style);
	};
	
	/**
	 * 判断给定CSS样式表是否已创建。
	 * 
	 * @param id 样式表元素ID
	 */
	chartFactory.isStyleSheetCreated = function(id)
	{
		var style = document.getElementById(id);
		
		return (style != null && style.type == "text/css");
	};
	
	/**
	 * 生成一个新的页面元素ID。
	 * 这个ID仅包含[a-z]、[A-Z]、[0-9]，且以字母开头。
	 *
	 * @param prefix 可选，ID前缀
	 */
	chartFactory.nextElementId = function(prefix)
	{
		if(prefix == null)
			prefix = "";
		
		var seq = (this._nextElementIdSequence != null ? this._nextElementIdSequence : 0);
		this._nextElementIdSequence = seq + 1;
		
		return this._ELEMENT_ID_PREFIX + prefix + seq;
	};
	
	/**
	 * 将给定值按照HTML规范转义，如果不是字符串，直接返回原值。
	 */
	chartFactory.escapeHtml = function(value)
	{
		if(typeof(value) != "string")
			return value;
		
		var epn = "";
		
		for(var i=0; i<value.length; i++)
		{
			var c = value.charAt(i);
			
			if(c == '<')
				epn += '&lt;';
			else if(c == '>')
				epn += '&gt;';
			else if(c == '&')
				epn += '&amp;';
			else if(c == '"')
				epn += '&quot;';
			else if(c == '\'')
				epn += '&#39;';
			else
				epn += c;
		}
		
		return epn;
	};
	
	/**
	 * 记录异常日志。
	 * 
	 * @param exception 异常对象、异常消息字符串
	 */
	chartFactory.logException = function(exception)
	{
		if(typeof console != "undefined")
		{
			if(console.error)
				console.error(exception);
			else if(console.warn)
				console.warn(exception);
			else if(console.info)
				console.info(exception);
		}
	};
	
	/**
	 * 记录警告日志。
	 * 
	 * @param exception 警告消息字符串
	 */
	chartFactory.logWarn = function(exception)
	{
		if(typeof console != "undefined")
		{
			if(console.warn)
				console.warn(exception);
			else if(console.info)
				console.info(exception);
		}
	};
	
	/**
	 * 由图表主题构建ECharts主题。
	 * 
	 * @param chartTheme 图表主题对象：org.datagear.analysis.ChartTheme
	 */
	chartFactory.buildEchartsTheme = function(chartTheme)
	{
		var axisColor = chartFactory.gradualColor(chartTheme, 0.7);
		var axisScaleLineColor = chartFactory.gradualColor(chartTheme, 0.35);
		var areaColor0 = chartFactory.gradualColor(chartTheme, 0.15);
		var areaBorderColor0 = chartFactory.gradualColor(chartTheme, 0.3);
		var areaColor1 = chartFactory.gradualColor(chartTheme, 0.25);
		var areaBorderColor1 = chartFactory.gradualColor(chartTheme, 0.5);
		var shadowColor = chartFactory.gradualColor(chartTheme, 0.9);
		
		// < @deprecated 兼容1.8.1版本有ChartTheme.axisColor的结构
		if(chartTheme.axisColor)
			axisColor = chartTheme.axisColor;
		// > @deprecated 兼容1.8.1版本有ChartTheme.axisColor的结构
		
		// < @deprecated 兼容1.8.1版本有ChartTheme.axisScaleLineColor的结构
		if(chartTheme.axisScaleLineColor)
			axisScaleLineColor = chartTheme.axisScaleLineColor;
		// > @deprecated 兼容1.8.1版本有ChartTheme.axisScaleLineColor的结构
		
		var theme =
		{
			"color" : chartTheme.graphColors,
			"backgroundColor" : chartTheme.backgroundColor,
			"textStyle" : {},
			"title" : {
		        "left" : "center",
				"textStyle" : {
					"color" : chartTheme.titleColor
				},
				"subtextStyle" : {
					"color" : chartTheme.titleColor
				}
			},
			"line" : {
				"itemStyle" : {
					"borderWidth" : 2
				},
				"lineStyle" : {
					"width" : 2
				},
				"symbol" : "circle",
				"symbolSize" : 8,
				"smooth" : false,
				"emphasis" :
				{
					"lineStyle" :
					{
						"width" : 4
					}
				}
			},
			"radar" : {
				"name" : { "textStyle" : { "color" : chartTheme.legendColor } },
				"axisLine" : { "lineStyle" : { "color" : areaBorderColor0 } },
				"splitLine" : { "lineStyle" : { "color" : areaBorderColor0 } },
				"splitArea" : { "areaStyle" : { "color" : [ areaColor0, chartTheme.backgroundColor ] } },
				"itemStyle" : {
					"borderWidth" : 1
				},
				"lineStyle" : {
					"width" : 2
				},
				"emphasis" :
				{
					"lineStyle" : {
						"width" : 4,
						"shadowBlur" : 5,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					}
				},
				"symbolSize" : 6,
				"symbol" : "circle",
				"smooth" : false
			},
			"bar" : {
				"itemStyle" : {
					"barBorderWidth" : 0,
					"barBorderColor" : chartTheme.borderColor
				},
				"label":
				{
					"color": chartTheme.color
				},
				"emphasis" : {
					"itemStyle" : {
						"barBorderWidth" : 0,
						"barBorderColor" : chartTheme.borderColor,
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
				        "shadowOffsetY" : 0
					}
				}
			},
			"pie" : {
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor
				},
				"label":
				{
					"color": chartTheme.color
				},
				"emphasis" :
				{
					"itemStyle":
					{
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				},
				"emptyCircleStyle":
				{
					"color": chartFactory.gradualColor(chartTheme, 0),
					"borderColor": chartFactory.gradualColor(chartTheme, 0.1)
				}
			},
			"scatter" : {
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor,
					"shadowBlur" : 3,
					"shadowColor" : shadowColor
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor,
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					}
				}
			},
			"boxplot" : {
				"itemStyle" : {
					"color": "transparent"
				},
				"emphasis" : {
					"itemStyle" : {
						"color": "transparent"
					}
				}
			},
			"parallel" : {
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"sankey" : {
				"label":
				{
					"color": chartTheme.color
				},
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor
				},
				"lineStyle":
				{
					"color": areaColor1,
					"opacity": 1
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					},
					"lineStyle":
					{
						"color": axisColor,
						"opacity": 0.6
					},
					"focus": "adjacency"
				}
			},
			"funnel" :
			{
				"left": "10%",
	            "top": "20%",
	            "right": "10%",
	            "bottom": "10%",
	            "minSize": "0%",
	            "maxSize": "100%",
				"label" : {
					"color" : chartTheme.color,
					"show": true,
	                "position": "inside"
	            },
				"itemStyle" : {
					"borderColor" : chartTheme.borderColor,
					"borderWidth" : 0
				},
				"emphasis" : {
					"label" : {
	                    "fontSize" : 20
	                },
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"gauge" : {
				"title" : { "color" : chartTheme.legendColor },
				"detail":
				{
					"color": chartTheme.legendColor
				},
				"progress":
				{
					"show": true
		        },
				"axisLine":
				{
					"show": true,
					"lineStyle":
					{
						"color" : [ [ 1, areaColor1 ] ]
					}
		        },
				"axisLabel":
				{
					"color" : axisColor
				},
				"splitLine":
				{
					"lineStyle":
					{
						"color": axisScaleLineColor
					}
				},
				"axisTick":
				{
					"lineStyle":
					{
						"color": axisScaleLineColor
					}
				},
				"itemStyle" : {
					"borderColor" : chartTheme.borderColor,
					"borderWidth" : 0
				},
				"emphasis" : {
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"candlestick" : {
				"itemStyle" : {
					"borderWidth" : 1
				},
				"emphasis" : {
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					}
				}
			},
			"heatmap":
			{
				"label":
				{
					"show": true
				},
				"emphasis" :
				{
					"itemStyle" :
					{
						"shadowBlur" : 5
					}
				}
			},
			"tree":
			{
				"expandAndCollapse": true,
				"label":
				{
					"color": chartTheme.color
				},
				"itemStyle":
				{
					"color": chartTheme.color
				},
				"lineStyle": { "color": areaBorderColor0 },
				"emphasis" :
				{
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					}
				}
			},
			"treemap":
			{
				"itemStyle" :
				{
					"borderWidth": 0.5,
					"borderColor": chartTheme.backgroundColor
				},
				"emphasis" :
				{
					"itemStyle" : {
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor,
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor
					}
				},
				"breadcrumb":
				{
					"itemStyle":
					{
						"color": chartTheme.backgroundColor,
						"borderColor": chartTheme.borderColor,
						"shadowBlur": 0,
						"textStyle": { color: chartTheme.color }
					}
				}
			},
			"sunburst":
			{
				"itemStyle" :
				{
					"borderWidth" : 1,
					"borderColor" : chartTheme.backgroundColor
				},
				"emphasis" :
				{
					"itemStyle" :
					{
						"shadowBlur" : 10,
						"shadowColor" : shadowColor,
						"borderColor" : chartTheme.borderColor
					}
				}
			},
			"graph" :
			{
				"left": "12%",
                "right": "12%",
                "top": "20%",
                "bottom": "12%",
				"roam": true,
				"itemStyle" : {
					"borderWidth" : 0,
					"borderColor" : chartTheme.borderColor,
					"shadowBlur" : 2,
					"shadowColor" : shadowColor
				},
				"lineStyle" : {
                    "color": "source",
                    "curveness": 0.3
				},
				"label" : {
					"color" : chartTheme.color
				},
				"emphasis" : {
					"itemStyle" : {
						"borderWidth" : 0,
						"borderColor" : chartTheme.borderColor,
						"shadowBlur" : 10,
						"shadowOffsetX" : 0,
						"shadowColor" : shadowColor
					},
					"lineStyle" : {
						"width": 4
					},
					"focus": "adjacency",
					"legendHoverLink": true,
					"label": { "position": "right" }
				}
			},
			"map" : {
				"roam" : true,
				"itemStyle" : {
					"areaColor" : areaColor1,
					"borderColor" : areaBorderColor1,
					"borderWidth" : 0.5
				},
				"label" : {
					"show": true,
					"color" : chartTheme.color
				},
				"emphasis" :
				{
					"label":
					{
						"color" : chartTheme.highlightTheme.color
					},
					"itemStyle":
					{
						"areaColor" : chartTheme.highlightTheme.backgroundColor,
						"borderColor" : chartTheme.highlightTheme.borderColor,
						"borderWidth" : 1
					}
				}
			},
			"geo" : {
				"itemStyle" : {
					"areaColor" : areaColor1,
					"borderColor" : areaBorderColor1,
					"borderWidth" : 0.5
				},
				"label" : {
					"color" : chartTheme.color
				},
				"emphasis" :
				{
					"label":
					{
						"color" : chartTheme.highlightTheme.color
					},
					"itemStyle":
					{
						"areaColor" : chartTheme.highlightTheme.backgroundColor,
						"borderColor" : chartTheme.highlightTheme.borderColor,
						"borderWidth" : 1
					}
				}
			},
			"categoryAxis" : {
				"axisLine" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisTick" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisLabel" : {
					"show" : true,
					"textStyle" : {
						"color" : axisColor
					}
				},
				"splitLine" : {
					"show" : true,
					"lineStyle" : {
						"type" : "dotted",
						"color" : [ axisScaleLineColor ]
					}
				},
				"splitArea" : {
					"show" : false,
					"areaStyle" : {
						"color" : [ axisScaleLineColor ]
					}
				}
			},
			"valueAxis" : {
				"axisLine" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisTick" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisLabel" : {
					"show" : true,
					"textStyle" : {
						"color" : axisColor
					}
				},
				"splitLine" : {
					"show" : true,
					"lineStyle" : {
						"type" : "dotted",
						"color" : [ axisScaleLineColor ]
					}
				},
				"splitArea" : {
					"show" : false,
					"areaStyle" : {
						"color" : [ axisScaleLineColor ]
					}
				}
			},
			"logAxis" : {
				"axisLine" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisTick" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisLabel" : {
					"show" : true,
					"textStyle" : {
						"color" : axisColor
					}
				},
				"splitLine" : {
					"show" : true,
					"lineStyle" : {
						"type" : "dotted",
						"color" : [ axisScaleLineColor ]
					}
				},
				"splitArea" : {
					"show" : false,
					"areaStyle" : {
						"color" : [ axisScaleLineColor ]
					}
				}
			},
			"timeAxis" : {
				"axisLine" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisTick" : {
					"show" : true,
					"lineStyle" : {
						"color" : axisColor
					}
				},
				"axisLabel" : {
					"show" : true,
					"textStyle" : {
						"color" : axisColor
					}
				},
				"splitLine" : {
					"show" : true,
					"lineStyle" : {
						"type" : "dotted",
						"color" : [ axisScaleLineColor ]
					}
				},
				"splitArea" : {
					"show" : false,
					"areaStyle" : {
						"color" : [ axisScaleLineColor ]
					}
				}
			},
			"toolbox" : {
				"iconStyle" : {
					"normal" : {
						"borderColor" : chartTheme.borderColor
					},
					"emphasis" : {
						"borderColor" : axisColor
					}
				}
			},
			"grid":
			{
				"left": 30,
				"right": 46,
				"top": 80,
				"bottom": 20,
				"containLabel": true
			},
			"legend" : {
				"orient": "horizontal",
				"top": 25,
				"textStyle" : {
					"color" : chartTheme.legendColor
				},
				"inactiveColor" : axisScaleLineColor
			},
			"tooltip" : {
				"backgroundColor" : chartTheme.tooltipTheme.backgroundColor,
				"borderColor" : chartTheme.tooltipTheme.borderColor,
				"borderWidth" : chartTheme.tooltipTheme.borderWidth,
				"textStyle" : { color: chartTheme.tooltipTheme.color },
				"axisPointer" : {
					"lineStyle" : {
						"color" : axisColor,
						"width" : "1"
					},
					"crossStyle" : {
						"color" : axisColor,
						"width" : "1"
					}
				}
			},
			"timeline" : {
				"lineStyle" : {
					"color" : axisColor,
					"width" : 1
				},
				"itemStyle" : {
					"normal" : {
						"color" : chartTheme.color,
						"borderWidth" : 1
					},
					"emphasis" : {
						"color" : chartTheme.color
					}
				},
				"controlStyle" : {
					"normal" : {
						"color" : chartTheme.color,
						"borderColor" : chartTheme.borderColor,
						"borderWidth" : 0.5
					},
					"emphasis" : {
						"color" : chartTheme.color,
						"borderColor" : chartTheme.borderColor,
						"borderWidth" : 0.5
					}
				},
				"checkpointStyle" : {
					"color" : chartTheme.highlightTheme.backgroundColor,
					"borderColor" : chartTheme.highlightTheme.borderColor
				},
				"label" : {
					"normal" : {
						"textStyle" : {
							"color" : axisColor
						}
					},
					"emphasis" : {
						"textStyle" : {
							"color" : chartTheme.color
						}
					}
				}
			},
			"visualMap" : {
				"inRange" :
				{
					"color" : chartTheme.graphRangeColors
				},
				"backgroundColor" : "transparent",
				"textStyle" :
				{
					"color" : axisColor
				}
			},
			"dataZoom" : {
				"backgroundColor" : "transparent",
				"dataBackgroundColor" : axisScaleLineColor,
				"fillerColor" : axisScaleLineColor,
				"handleColor" : axisScaleLineColor,
				"handleSize" : "100%",
				"textStyle" : {
					"color" : axisColor
				}
			},
			"markPoint" : {
				"label" : {
					"normal" : {
						"textStyle" : {
							"color" : axisColor
						}
					},
					"emphasis" : {
						"textStyle" : {
							"color" : axisColor
						}
					}
				}
			}
		};
		
		return theme;
	};
	
	//-------------
	// < 已弃用函数 start
	//-------------
	
	// < @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被dashboardBase.renderedChart取代
	/**
	 * 判断指定HTML元素是否是已渲染为图表。
	 * 
	 * @param element HTML元素、Jquery对象
	 */
	chartFactory.isChartElement = function(element)
	{
		return (this.renderedChart(element) != null);
	};
	// > @deprecated 兼容2.3.0版本的API，将在未来版本移除，已被dashboardBase.renderedChart取代
	
	//-------------
	// > 已弃用函数 end
	//-------------
})
(this);