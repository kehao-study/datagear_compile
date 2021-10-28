/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

package org.datagear.management.service.impl;

import org.apache.ibatis.session.SqlSessionFactory;
import org.datagear.management.domain.AnalysisProject;
import org.datagear.management.domain.User;
import org.datagear.management.service.AnalysisProjectAuthorizationListener;
import org.datagear.management.service.AnalysisProjectService;
import org.datagear.management.service.AuthorizationService;
import org.datagear.management.service.PermissionDeniedException;
import org.datagear.management.service.UserService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain AnalysisProjectService}实现类。
 * 
 * @author datagear@163.com
 *
 */
public class AnalysisProjectServiceImpl extends AbstractMybatisDataPermissionEntityService<String, AnalysisProject>
		implements AnalysisProjectService, AnalysisProjectAuthorizationListenerAware
{
	protected static final String SQL_NAMESPACE = AnalysisProject.class.getName();

	private UserService userService;

	private AnalysisProjectAuthorizationListener analysisProjectAuthorizationListener = null;

	public AnalysisProjectServiceImpl()
	{
		super();
	}

	public AnalysisProjectServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect,
			AuthorizationService authorizationService, UserService userService)
	{
		super(sqlSessionFactory, dialect, authorizationService);
		this.userService = userService;
	}

	public AnalysisProjectServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect,
			AuthorizationService authorizationService, UserService userService)
	{
		super(sqlSessionTemplate, dialect, authorizationService);
		this.userService = userService;
	}

	public UserService getUserService()
	{
		return userService;
	}

	public void setUserService(UserService userService)
	{
		this.userService = userService;
	}

	@Override
	public AnalysisProjectAuthorizationListener getAnalysisProjectAuthorizationListener()
	{
		return analysisProjectAuthorizationListener;
	}

	@Override
	public void setAnalysisProjectAuthorizationListener(
			AnalysisProjectAuthorizationListener analysisProjectAuthorizationListener)
	{
		this.analysisProjectAuthorizationListener = analysisProjectAuthorizationListener;
	}

	@Override
	public String getResourceType()
	{
		return AnalysisProject.AUTHORIZATION_RESOURCE_TYPE;
	}

	@Override
	public AnalysisProject getByStringId(User user, String id) throws PermissionDeniedException
	{
		return getById(user, id);
	}

	@Override
	public int updateCreateUserId(String oldUserId, String newUserId)
	{
		return super.updateCreateUserId(oldUserId, newUserId);
	}

	@Override
	public int updateCreateUserId(String[] oldUserIds, String newUserId)
	{
		return super.updateCreateUserId(oldUserIds, newUserId);
	}

	@Override
	protected AnalysisProject postProcessGet(AnalysisProject obj)
	{
		inflateCreateUserEntity(obj, this.userService);
		return super.postProcessGet(obj);
	}

	@Override
	public void authorizationUpdated(String resourceType, String... resources)
	{
		boolean updated = authorizationUpdatedInner(resourceType, resources);

		if (updated && this.analysisProjectAuthorizationListener != null)
			this.analysisProjectAuthorizationListener.authorizationUpdated(resources);
	}

	@Override
	protected void checkAddInput(AnalysisProject entity)
	{
		if (isBlank(entity.getId()) || isBlank(entity.getName()) || isEmpty(entity.getCreateUser()))
			throw new IllegalArgumentException();
	}

	@Override
	protected void checkUpdateInput(AnalysisProject entity)
	{
		if (isBlank(entity.getId()) || isBlank(entity.getName()))
			throw new IllegalArgumentException();
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}
}
