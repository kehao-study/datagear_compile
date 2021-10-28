/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

package org.datagear.analysis;

/**
 * 图表。
 * 
 * @author datagear@163.com
 *
 */
public class Chart extends ChartDefinition
{
	private static final long serialVersionUID = 1L;

	private ChartPlugin plugin;

	private transient RenderContext renderContext;

	public Chart()
	{
		super();
	}

	public Chart(String id, String name, ChartDataSet[] chartDataSets, ChartPlugin plugin, RenderContext renderContext)
	{
		super(id, name, chartDataSets);
		this.plugin = plugin;
		this.renderContext = renderContext;
	}

	public Chart(ChartDefinition chartDefinition, ChartPlugin plugin, RenderContext renderContext)
	{
		super(chartDefinition);
		this.plugin = plugin;
		this.renderContext = renderContext;
	}

	public Chart(Chart chart)
	{
		this(chart, chart.plugin, chart.renderContext);
	}

	public RenderContext getRenderContext()
	{
		return renderContext;
	}

	public void setRenderContext(RenderContext renderContext)
	{
		this.renderContext = renderContext;
	}

	public ChartPlugin getPlugin()
	{
		return plugin;
	}

	public void setPlugin(ChartPlugin plugin)
	{
		this.plugin = plugin;
	}
}
