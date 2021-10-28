/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

package org.datagear.management.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.apache.ibatis.session.RowBounds;
import org.apache.ibatis.session.SqlSessionFactory;
import org.datagear.management.domain.Authorization;
import org.datagear.management.domain.DataIdPermission;
import org.datagear.management.domain.DataPermissionEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.AnalysisProjectAwareEntityService;
import org.datagear.management.service.AuthorizationService;
import org.datagear.management.service.DataPermissionEntityService;
import org.datagear.management.service.PermissionDeniedException;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.datagear.persistence.PagingData;
import org.datagear.persistence.PagingQuery;
import org.datagear.persistence.Query;
import org.datagear.util.StringUtil;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.cache.Cache.ValueWrapper;

/**
 * 抽象基于Mybatis的{@linkplain DataPermissionEntityService}实现类。
 * 
 * @author datagear@163.com
 *
 */
public abstract class AbstractMybatisDataPermissionEntityService<ID, T extends DataPermissionEntity<ID>>
		extends AbstractMybatisEntityService<ID, T> implements DataPermissionEntityService<ID, T>
{
	private AuthorizationService authorizationService;

	private ServiceCache permissionCache;

	/**
	 * 查询操作时缓存权限数目。
	 */
	private int permissionCacheCountForQuery = 10;

	public AbstractMybatisDataPermissionEntityService()
	{
		super();
	}

	public AbstractMybatisDataPermissionEntityService(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect,
			AuthorizationService authorizationService)
	{
		super(sqlSessionFactory, dialect);
		this.authorizationService = authorizationService;
	}

	public AbstractMybatisDataPermissionEntityService(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect,
			AuthorizationService authorizationService)
	{
		super(sqlSessionTemplate, dialect);
		this.authorizationService = authorizationService;
	}

	public AuthorizationService getAuthorizationService()
	{
		return authorizationService;
	}

	public void setAuthorizationService(AuthorizationService authorizationService)
	{
		this.authorizationService = authorizationService;
	}

	public ServiceCache getPermissionCache()
	{
		return permissionCache;
	}

	public void setPermissionCache(ServiceCache permissionCache)
	{
		this.permissionCache = permissionCache;
	}

	public int getPermissionCacheCountForQuery()
	{
		return permissionCacheCountForQuery;
	}

	public void setPermissionCacheCountForQuery(int permissionCacheCountForQuery)
	{
		this.permissionCacheCountForQuery = permissionCacheCountForQuery;
	}

	@Override
	public int getPermission(User user, ID id)
	{
		List<ID> ids = new ArrayList<>(1);
		ids.add(id);

		List<Integer> permissions = getPermissions(user, ids);

		return permissions.get(0);
	}

	@Override
	public int[] getPermissions(User user, ID[] ids)
	{
		List<ID> idList = Arrays.asList(ids);

		List<Integer> permissions = getPermissions(user, idList);

		int[] re = new int[permissions.size()];

		for (int i = 0; i < re.length; i++)
			re[i] = permissions.get(i);

		return re;
	}

	@Override
	public void add(User user, T entity) throws PermissionDeniedException
	{
		super.add(entity);
	}

	@Override
	public boolean update(User user, T entity) throws PermissionDeniedException
	{
		int permission = getPermission(user, entity.getId());

		if (!Authorization.canEdit(permission))
			throw new PermissionDeniedException();

		return super.update(entity);
	}

	@Override
	public boolean deleteById(User user, ID id) throws PermissionDeniedException
	{
		int permission = getPermission(user, id);

		if (!Authorization.canDelete(permission))
			throw new PermissionDeniedException();

		return super.deleteById(id);
	}

	@Override
	public boolean[] deleteByIds(User user, ID[] ids) throws PermissionDeniedException
	{
		int[] permissions = getPermissions(user, ids);

		for (int i = 0; i < permissions.length; i++)
		{
			if (!Authorization.canDelete(permissions[i]))
				throw new PermissionDeniedException();
		}

		boolean[] re = new boolean[ids.length];

		for (int i = 0; i < ids.length; i++)
			re[i] = super.deleteById(ids[i]);

		return re;
	}

	@Override
	public T getById(User user, ID id) throws PermissionDeniedException
	{
		int permission = getPermission(user, id);

		if (!Authorization.canRead(permission))
			throw new PermissionDeniedException();

		T entity = super.getById(id);

		if (entity != null)
			entity.setDataPermission(permission);

		return entity;
	}

	@Override
	public T getByIdForEdit(User user, ID id) throws PermissionDeniedException
	{
		int permission = getPermission(user, id);

		if (!Authorization.canEdit(permission))
			throw new PermissionDeniedException();

		T entity = super.getById(id);

		if (entity != null)
			entity.setDataPermission(permission);

		return entity;
	}

	@Override
	public List<T> query(User user, Query query)
	{
		Map<String, Object> params = buildParamMap();
		addDataPermissionParameters(params, user);

		return query(query, params, true);
	}

	@Override
	public PagingData<T> pagingQuery(User user, PagingQuery pagingQuery)
	{
		return pagingQuery(user, pagingQuery, null);
	}

	@Override
	public PagingData<T> pagingQuery(User user, PagingQuery pagingQuery, String dataFilter)
	{
		Map<String, Object> params = buildParamMap();
		addDataPermissionParameters(params, user);
		setDataFilterParam(params, dataFilter);

		return pagingQuery(pagingQuery, params, true);
	}

	@Override
	public void authorizationUpdated(String resourceType, String... resources)
	{
		authorizationUpdatedInner(resourceType, resources);
	}

	protected boolean authorizationUpdatedInner(String resourceType, String... resources)
	{
		if (!getResourceType().equals(resourceType))
			return false;

		if (!isPermissionCacheEnabled())
			return false;

		for (String res : resources)
			this.permissionCache.evictImmediately(toPermissionCacheKeyOfStr(res));

		return true;
	}

	@Override
	public void permissionUpdated()
	{
		permissionCacheInvalidate();
	}

	protected void setDataFilterParam(Map<String, Object> params, String dataFilter)
	{
		if (!StringUtil.isEmpty(dataFilter))
			params.put("_dataFilter", dataFilter);
	}

	protected PagingData<T> pagingQueryForAnalysisProjectId(User user, PagingQuery pagingQuery, String dataFilter,
			String analysisProjectId, boolean postProcessQuery)
	{
		Map<String, Object> params = buildParamMap();
		addDataPermissionParameters(params, user);
		setDataFilterParam(params, dataFilter);

		if (!StringUtil.isEmpty(analysisProjectId))
			params.put(AnalysisProjectAwareEntityService.QUERY_PARAM_ANALYSIS_PROJECT_ID, analysisProjectId);

		return pagingQuery(pagingQuery, params, postProcessQuery);
	}

	@Override
	protected boolean deleteById(ID id, Map<String, Object> params)
	{
		boolean deleted = super.deleteById(id, params);

		if (deleted)
			this.authorizationService.deleteByResource(getResourceType(), id.toString());

		return deleted;
	}

	@Override
	protected int updateCreateUserId(String[] oldUserIds, String newUserId)
	{
		int count = super.updateCreateUserId(oldUserIds, newUserId);

		if (count > 0)
			permissionCacheInvalidate();

		return count;
	}

	@Override
	protected List<T> query(String statement, Map<String, Object> params)
	{
		List<T> list = super.query(statement, params);

		permissionCachePutQueryResult(statement, params, list);

		return list;
	}

	@Override
	protected List<T> query(String statement, Map<String, Object> params, RowBounds rowBounds)
	{
		List<T> list = super.query(statement, params, rowBounds);

		permissionCachePutQueryResult(statement, params, list);

		return list;
	}

	/**
	 * 获取权限列表。
	 * <p>
	 * 对于没有授权的，将返回{@linkplain #PERMISSION_NOT_FOUND}权限值。
	 * </p>
	 * 
	 * @param user
	 * @param ids
	 * @return
	 */
	protected List<Integer> getPermissions(User user, List<ID> ids)
	{
		int len = ids.size();

		Map<ID, Integer> permissions = getPermissionsFromCache(user, ids);

		List<ID> noCachedIds = Collections.emptyList();

		if (permissions.isEmpty())
			noCachedIds = ids;
		else
		{
			for (int i = 0; i < len; i++)
			{
				ID id = ids.get(i);
				if (!permissions.containsKey(id))
					noCachedIds.add(id);
			}
		}

		getPermissionsFromDB(user, noCachedIds, permissions, true);

		List<Integer> re = new ArrayList<>(len);

		for (int i = 0; i < len; i++)
		{
			ID id = ids.get(i);
			Integer permission = permissions.get(id);

			if (permission == null)
				permission = PERMISSION_NOT_FOUND;

			re.add(permission);
		}

		return re;
	}

	/**
	 * 获取缓存中的权限。
	 * 
	 * @param user
	 * @param ids
	 * @return
	 */
	protected Map<ID, Integer> getPermissionsFromCache(User user, List<ID> ids)
	{
		Map<ID, Integer> permissions = new HashMap<ID, Integer>();

		if (!isPermissionCacheEnabled())
			return permissions;

		String userId = user.getId();

		for (int i = 0, len = ids.size(); i < len; i++)
		{
			ID id = ids.get(i);
			Integer permission = permissionCacheGet(id, userId);

			if (permission != null)
				permissions.put(id, permission);
		}

		return permissions;
	}

	/**
	 * 获取底层数据库的权限。
	 * 
	 * @param user
	 * @param ids
	 * @param permissions
	 * @param cache
	 */
	protected void getPermissionsFromDB(User user, List<ID> ids, Map<ID, Integer> permissions, boolean cache)
	{
		if(ids.isEmpty())
			return;
		
		String userId = user.getId();

		Map<String, Object> params = buildParamMap();
		addDataPermissionParameters(params, user);
		params.put("ids", ids);

		List<DataIdPermission> dataPermissions = selectListMybatis("getDataIdPermissions", params);

		for (int i = 0, len = ids.size(); i < len; i++)
		{
			Integer permission = null;
			ID id = ids.get(i);
			String idStr = id.toString();

			for (DataIdPermission p : dataPermissions)
			{
				if (idStr.equals(p.getDataId()))
				{
					permission = p.getDataPermission();
					break;
				}
			}

			if (permission == null)
				permission = PERMISSION_NOT_FOUND;
			
			permissions.put(id, permission);

			if (cache)
				permissionCachePut(id, userId, permission);
		}
	}

	protected Integer permissionCacheGet(ID id, String userId)
	{
		if (!isPermissionCacheEnabled())
			return null;

		ValueWrapper valueWrapper = this.permissionCache.get(toPermissionCacheKey(id));
		UserIdPermissionMap upm = (valueWrapper == null ? null : (UserIdPermissionMap) valueWrapper.get());

		return (upm == null ? null : upm.getPermission(userId));
	}

	protected void permissionCachePut(ID id, String userId, int permission)
	{
		if (!isPermissionCacheEnabled())
			return;

		Object key = toPermissionCacheKey(id);

		ValueWrapper valueWrapper = this.permissionCache.get(key);
		UserIdPermissionMap upm = (valueWrapper == null ? null : (UserIdPermissionMap) valueWrapper.get());
		if (upm == null)
		{
			upm = new UserIdPermissionMap();
			this.permissionCache.put(key, upm);
		}

		upm.putPermission(userId, permission);
	}

	protected void permissionCachePutQueryResult(String statement, Map<String, Object> params, List<T> result)
	{
		if (params == null || result == null || this.permissionCacheCountForQuery <= 0)
			return;

		User user = (User) params.get(DATA_PERMISSION_PARAM_CURRENT_USER);

		if (user == null)
			return;

		String userId = user.getId();

		int count = 0;

		for (T t : result)
		{
			if (count >= this.permissionCacheCountForQuery)
				break;

			ID id = (t == null ? null : t.getId());

			if (id == null)
				continue;

			int permission = t.getDataPermission();

			if (Authorization.isLegalPermission(permission))
			{
				permissionCachePut(id, userId, permission);
				count++;
			}
		}
	}

	protected void permissionCacheInvalidate()
	{
		if (!isPermissionCacheEnabled())
			return;

		this.permissionCache.invalidate();
	}

	/**
	 * 获取指定实体ID的权限缓存关键字。
	 * <p>
	 * 调用此方法前应确保{@linkplain #isPermissionCacheEnabled()}为{@code true}。
	 * </p>
	 * 
	 * @param id
	 * @return
	 */
	protected Object toPermissionCacheKey(ID id)
	{
		String idStr = (id == null ? null : id.toString());
		return toPermissionCacheKeyOfStr(idStr);
	}

	/**
	 * 获取指定实体ID的权限缓存关键字。
	 * <p>
	 * 调用此方法前应确保{@linkplain #isPermissionCacheEnabled()}为{@code true}。
	 * </p>
	 * 
	 * @param id
	 * @return
	 */
	protected Object toPermissionCacheKeyOfStr(String id)
	{
		if (this.permissionCache.isShared())
			return new GlobalEntityCacheKey<String>(getSqlNamespace() + "Permission", id);
		else
			return id;
	}

	protected boolean isPermissionCacheEnabled()
	{
		return (this.permissionCache != null && this.permissionCache.isEnable());
	}

	/**
	 * 添加数据权限SQL参数。
	 * <p>
	 * 子类可以重写此方法重新设置数据权限SQL参数。
	 * </p>
	 * <p>
	 * 此方法默认实现是：调用{@linkplain #addDataPermissionParameters(Map, User, String, boolean)}，
	 * 其中，{@code resourceType}为{@linkplain #getResourceType()}、{@code resourceHasCreator}为{@code true}。
	 * </p>
	 * 
	 * @param params
	 * @param user
	 */
	protected void addDataPermissionParameters(Map<String, Object> params, User user)
	{
		addDataPermissionParameters(params, user, getResourceType(), true);
	}

	/**
	 * 添加数据权限SQL参数。
	 * 
	 * @param params
	 * @param user
	 * @param resourceType
	 * @param resourceHasCreator
	 */
	protected void addDataPermissionParameters(Map<String, Object> params, User user, String resourceType,
			boolean resourceHasCreator)
	{
		params.put(DATA_PERMISSION_PARAM_CURRENT_USER, user);
		params.put(DATA_PERMISSION_PARAM_RESOURCE_TYPE, resourceType);
		params.put(DATA_PERMISSION_PARAM_RESOURCE_HAS_CREATOR, resourceHasCreator);
		params.put(DATA_PERMISSION_PARAM_MIN_READ_PERMISSION, Authorization.PERMISSION_READ_START);
		params.put(DATA_PERMISSION_PARAM_MAX_PERMISSION, Authorization.PERMISSION_MAX);
		params.put(DATA_PERMISSION_PARAM_UNSET_PERMISSION, Authorization.PERMISSION_NONE_START);
	}

	protected static class UserIdPermissionMap
	{
		private ConcurrentMap<String, Integer> userIdPermissions = new ConcurrentHashMap<String, Integer>();

		public UserIdPermissionMap()
		{
			super();
		}

		public Integer getPermission(String userId)
		{
			return this.userIdPermissions.get(userId);
		}

		public void putPermission(String userId, Integer permission)
		{
			this.userIdPermissions.put(userId, permission);
		}

		public void clear()
		{
			this.userIdPermissions.clear();
		}
	}
}
