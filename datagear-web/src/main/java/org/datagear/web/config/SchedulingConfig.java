/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

package org.datagear.web.config;

import org.datagear.web.util.DirectoryCleaner;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * 计划任务配置。
 * 
 * @author datagear@163.com
 *
 */
@Configuration
@EnableScheduling
public class SchedulingConfig
{
	private ApplicationProperties applicationProperties;

	private CoreConfig coreConfig;

	@Autowired
	public SchedulingConfig(ApplicationProperties applicationProperties, CoreConfig coreConfig)
	{
		this.applicationProperties = applicationProperties;
		this.coreConfig = coreConfig;
	}

	public ApplicationProperties getApplicationProperties()
	{
		return applicationProperties;
	}

	public void setApplicationProperties(ApplicationProperties applicationProperties)
	{
		this.applicationProperties = applicationProperties;
	}

	public CoreConfig getCoreConfig()
	{
		return coreConfig;
	}

	public void setCoreConfig(CoreConfig coreConfig)
	{
		this.coreConfig = coreConfig;
	}

	@Bean
	public DirectoryCleaner tempDirectoryCleaner()
	{
		int expiredMinutes = this.applicationProperties
				.getCleanTempDirectoryExpiredMinutes();

		DirectoryCleaner bean = new DirectoryCleaner(this.coreConfig.tempDirectory(), expiredMinutes);
		return bean;
	}

	@Scheduled(cron = "${cleanTempDirectory.interval}")
	public void cleanTempDirectory()
	{
		this.tempDirectoryCleaner().clean();
	}
}
