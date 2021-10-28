/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

package org.datagear.management.service.impl;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.hc.client5.http.classic.HttpClient;
import org.apache.ibatis.session.SqlSessionFactory;
import org.datagear.analysis.DataSet;
import org.datagear.analysis.DataSetParam;
import org.datagear.analysis.DataSetProperty;
import org.datagear.analysis.support.ProfileDataSet;
import org.datagear.connection.ConnectionSource;
import org.datagear.management.domain.AnalysisProject;
import org.datagear.management.domain.AnalysisProjectAwareEntity;
import org.datagear.management.domain.CsvFileDataSetEntity;
import org.datagear.management.domain.CsvValueDataSetEntity;
import org.datagear.management.domain.DataSetEntity;
import org.datagear.management.domain.DirectoryFileDataSetEntity;
import org.datagear.management.domain.ExcelDataSetEntity;
import org.datagear.management.domain.HttpDataSetEntity;
import org.datagear.management.domain.JsonFileDataSetEntity;
import org.datagear.management.domain.JsonValueDataSetEntity;
import org.datagear.management.domain.Schema;
import org.datagear.management.domain.SchemaConnectionFactory;
import org.datagear.management.domain.SqlDataSetEntity;
import org.datagear.management.domain.SummaryDataSetEntity;
import org.datagear.management.domain.User;
import org.datagear.management.service.AnalysisProjectService;
import org.datagear.management.service.AuthorizationService;
import org.datagear.management.service.DataSetEntityService;
import org.datagear.management.service.DataSetResDirectoryService;
import org.datagear.management.service.PermissionDeniedException;
import org.datagear.management.service.SchemaService;
import org.datagear.management.service.UserService;
import org.datagear.management.util.dialect.MbSqlDialect;
import org.datagear.persistence.PagingData;
import org.datagear.persistence.PagingQuery;
import org.datagear.util.FileUtil;
import org.datagear.util.StringUtil;
import org.mybatis.spring.SqlSessionTemplate;

/**
 * {@linkplain DataSetEntityService}实现类。
 * 
 * @author datagear@163.com
 *
 */
public class DataSetEntityServiceImpl extends AbstractMybatisDataPermissionEntityService<String, DataSetEntity>
		implements DataSetEntityService
{
	protected static final String SQL_NAMESPACE = DataSetEntity.class.getName();

	private ConnectionSource connectionSource;

	private SchemaService schemaService;

	private AnalysisProjectService analysisProjectService;

	private UserService userService;

	private DataSetResDirectoryService dataSetResDirectoryService;

	/** 数据集文件存储根目录 */
	private File dataSetRootDirectory;

	private HttpClient httpClient;

	public DataSetEntityServiceImpl()
	{
		super();
	}

	public DataSetEntityServiceImpl(SqlSessionFactory sqlSessionFactory, MbSqlDialect dialect,
			AuthorizationService authorizationService,
			ConnectionSource connectionSource, SchemaService schemaService,
			AnalysisProjectService analysisProjectService,
			UserService userService, DataSetResDirectoryService dataSetResDirectoryService,
			File dataSetRootDirectory, HttpClient httpClient)
	{
		super(sqlSessionFactory, dialect, authorizationService);
		this.connectionSource = connectionSource;
		this.schemaService = schemaService;
		this.analysisProjectService = analysisProjectService;
		this.userService = userService;
		this.dataSetResDirectoryService = dataSetResDirectoryService;
		setDataSetRootDirectory(dataSetRootDirectory);
		this.httpClient = httpClient;
	}

	public DataSetEntityServiceImpl(SqlSessionTemplate sqlSessionTemplate, MbSqlDialect dialect,
			AuthorizationService authorizationService,
			ConnectionSource connectionSource, SchemaService schemaService,
			AnalysisProjectService analysisProjectService,
			UserService userService, DataSetResDirectoryService dataSetResDirectoryService,
			File dataSetRootDirectory, HttpClient httpClient)
	{
		super(sqlSessionTemplate, dialect, authorizationService);
		this.connectionSource = connectionSource;
		this.schemaService = schemaService;
		this.analysisProjectService = analysisProjectService;
		this.userService = userService;
		this.dataSetResDirectoryService = dataSetResDirectoryService;
		setDataSetRootDirectory(dataSetRootDirectory);
		this.httpClient = httpClient;
	}

	public ConnectionSource getConnectionSource()
	{
		return connectionSource;
	}

	public void setConnectionSource(ConnectionSource connectionSource)
	{
		this.connectionSource = connectionSource;
	}

	public SchemaService getSchemaService()
	{
		return schemaService;
	}

	public void setSchemaService(SchemaService schemaService)
	{
		this.schemaService = schemaService;
	}

	public AnalysisProjectService getAnalysisProjectService()
	{
		return analysisProjectService;
	}

	public void setAnalysisProjectService(AnalysisProjectService analysisProjectService)
	{
		this.analysisProjectService = analysisProjectService;
	}

	public UserService getUserService()
	{
		return userService;
	}

	public void setUserService(UserService userService)
	{
		this.userService = userService;
	}

	public DataSetResDirectoryService getDataSetResDirectoryService()
	{
		return dataSetResDirectoryService;
	}

	public void setDataSetResDirectoryService(DataSetResDirectoryService dataSetResDirectoryService)
	{
		this.dataSetResDirectoryService = dataSetResDirectoryService;
	}

	public File getDataSetRootDirectory()
	{
		return dataSetRootDirectory;
	}

	public void setDataSetRootDirectory(File dataSetRootDirectory)
	{
		this.dataSetRootDirectory = dataSetRootDirectory;
	}

	@Override
	public HttpClient getHttpClient()
	{
		return httpClient;
	}

	public void setHttpClient(HttpClient httpClient)
	{
		this.httpClient = httpClient;
	}

	@Override
	public File getDataSetDirectory(String dataSetId)
	{
		return FileUtil.getDirectory(getDataSetRootDirectory(), dataSetId);
	}

	@Override
	public DataSet getDataSet(String id)
	{
		DataSetEntity entity = getById(id);

		if (entity instanceof SqlDataSetEntity)
		{
			SqlDataSetEntity sqlDataSetEntity = (SqlDataSetEntity) entity;
			SchemaConnectionFactory connectionFactory = sqlDataSetEntity.getConnectionFactory();

			if (connectionFactory != null)
				connectionFactory.setConnectionSource(this.connectionSource);
		}

		return entity;
	}

	@Override
	public ProfileDataSet getProfileDataSet(User user, String id)
	{
		ProfileDataSet profileDataSet = null;

		DataSetEntity entity = getById(user, id);

		profileDataSet = ProfileDataSet.valueOf(entity);

		return profileDataSet;
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
	public PagingData<DataSetEntity> pagingQuery(User user, PagingQuery pagingQuery, String dataFilter,
			String analysisProjectId)
	{
		return pagingQueryForAnalysisProjectId(user, pagingQuery, dataFilter, analysisProjectId, true);
	}

	@Override
	public void authorizationUpdated(String... analysisProjects)
	{
		permissionCacheInvalidate();
	}

	@Override
	protected void add(DataSetEntity entity, Map<String, Object> params)
	{
		if (entity instanceof SummaryDataSetEntity)
			throw new IllegalArgumentException();

		super.add(entity, params);

		if (entity instanceof SqlDataSetEntity)
			addSqlDataSetEntity((SqlDataSetEntity) entity);
		else if (entity instanceof JsonValueDataSetEntity)
			addJsonValueDataSetEntity((JsonValueDataSetEntity) entity);
		else if (entity instanceof JsonFileDataSetEntity)
			addJsonFileDataSetEntity((JsonFileDataSetEntity) entity);
		else if (entity instanceof ExcelDataSetEntity)
			addExcelDataSetEntity((ExcelDataSetEntity) entity);
		else if (entity instanceof CsvValueDataSetEntity)
			addCsvValueDataSetEntity((CsvValueDataSetEntity) entity);
		else if (entity instanceof CsvFileDataSetEntity)
			addCsvFileDataSetEntity((CsvFileDataSetEntity) entity);
		else if (entity instanceof HttpDataSetEntity)
			addHttpDataSetEntity((HttpDataSetEntity) entity);

		saveDataSetChildren(entity);
	}

	protected boolean addSqlDataSetEntity(SqlDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("insertSqlDataSetEntity", params) > 0);
	}

	protected boolean addJsonValueDataSetEntity(JsonValueDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("insertJsonValueDataSetEntity", params) > 0);
	}

	protected boolean addJsonFileDataSetEntity(JsonFileDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("insertJsonFileDataSetEntity", params) > 0);
	}

	protected boolean addExcelDataSetEntity(ExcelDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("insertExcelDataSetEntity", params) > 0);
	}

	protected boolean addCsvValueDataSetEntity(CsvValueDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("insertCsvValueDataSetEntity", params) > 0);
	}

	protected boolean addCsvFileDataSetEntity(CsvFileDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("insertCsvFileDataSetEntity", params) > 0);
	}

	protected boolean addHttpDataSetEntity(HttpDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("insertHttpDataSetEntity", params) > 0);
	}

	@Override
	protected boolean update(DataSetEntity entity, Map<String, Object> params)
	{
		if (entity instanceof SummaryDataSetEntity)
			throw new IllegalArgumentException();

		boolean success = super.update(entity, params);

		if (success)
		{
			if (entity instanceof SqlDataSetEntity)
				success = updateSqlDataSetEntity((SqlDataSetEntity) entity);
			else if (entity instanceof JsonValueDataSetEntity)
				success = updateJsonValueDataSetEntity((JsonValueDataSetEntity) entity);
			else if (entity instanceof JsonFileDataSetEntity)
				success = updateJsonFileDataSetEntity((JsonFileDataSetEntity) entity);
			else if (entity instanceof ExcelDataSetEntity)
				success = updateExcelDataSetEntity((ExcelDataSetEntity) entity);
			else if (entity instanceof CsvValueDataSetEntity)
				success = updateCsvValueDataSetEntity((CsvValueDataSetEntity) entity);
			else if (entity instanceof CsvFileDataSetEntity)
				success = updateCsvFileDataSetEntity((CsvFileDataSetEntity) entity);
			else if (entity instanceof HttpDataSetEntity)
				success = updateHttpDataSetEntity((HttpDataSetEntity) entity);
		}

		if (success)
			saveDataSetChildren(entity);

		return success;
	}

	protected boolean updateSqlDataSetEntity(SqlDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("updateSqlDataSetEntity", params) > 0);
	}

	protected boolean updateJsonValueDataSetEntity(JsonValueDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("updateJsonValueDataSetEntity", params) > 0);
	}

	protected boolean updateJsonFileDataSetEntity(JsonFileDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("updateJsonFileDataSetEntity", params) > 0);
	}

	protected boolean updateExcelDataSetEntity(ExcelDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("updateExcelDataSetEntity", params) > 0);
	}

	protected boolean updateCsvValueDataSetEntity(CsvValueDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("updateCsvValueDataSetEntity", params) > 0);
	}

	protected boolean updateCsvFileDataSetEntity(CsvFileDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("updateCsvFileDataSetEntity", params) > 0);
	}

	protected boolean updateHttpDataSetEntity(HttpDataSetEntity entity)
	{
		Map<String, Object> params = buildParamMap();
		params.put("entity", entity);

		return (updateMybatis("updateHttpDataSetEntity", params) > 0);
	}

	@Override
	public String getResourceType()
	{
		return SqlDataSetEntity.AUTHORIZATION_RESOURCE_TYPE;
	}

	@Override
	public DataSetEntity getByStringId(User user, String id) throws PermissionDeniedException
	{
		return getById(user, id);
	}

	@Override
	protected DataSetEntity getByIdFromDB(String id, Map<String, Object> params)
	{
		DataSetEntity entity = super.getByIdFromDB(id, params);

		if (entity == null)
			return null;

		if (DataSetEntity.DATA_SET_TYPE_SQL.equals(entity.getDataSetType()))
			entity = getSqlDataSetEntityById(entity.getId());
		else if (DataSetEntity.DATA_SET_TYPE_JsonValue.equals(entity.getDataSetType()))
			entity = getJsonValueDataSetEntityById(entity.getId());
		else if (DataSetEntity.DATA_SET_TYPE_JsonFile.equals(entity.getDataSetType()))
			entity = getJsonFileDataSetEntityById(entity.getId());
		else if (DataSetEntity.DATA_SET_TYPE_Excel.equals(entity.getDataSetType()))
			entity = getExcelDataSetEntityById(entity.getId());
		else if (DataSetEntity.DATA_SET_TYPE_CsvValue.equals(entity.getDataSetType()))
			entity = getCsvValueDataSetEntityById(entity.getId());
		else if (DataSetEntity.DATA_SET_TYPE_CsvFile.equals(entity.getDataSetType()))
			entity = getCsvFileDataSetEntityById(entity.getId());
		else if (DataSetEntity.DATA_SET_TYPE_Http.equals(entity.getDataSetType()))
			entity = getHttpDataSetEntityById(entity.getId());

		inflateParamsAndProperties(entity);

		return entity;
	}

	protected void inflateParamsAndProperties(DataSetEntity dataSetEntity)
	{
		if (dataSetEntity == null)
			return;

		Map<String, Object> params = buildParamMap();
		params.put("dataSetId", dataSetEntity.getId());

		List<DataSetPropertyPO> propertyPOs = selectListMybatis("getPropertyPOs", params);
		List<DataSetProperty> dataSetProperties = DataSetPropertyPO.to(propertyPOs);
		dataSetEntity.setProperties(dataSetProperties);

		List<DataSetParamPO> paramPOs = selectListMybatis("getParamPOs", params);
		List<DataSetParam> dataSetParams = DataSetParamPO.to(paramPOs);
		dataSetEntity.setParams(dataSetParams);
	}

	protected SqlDataSetEntity getSqlDataSetEntityById(String id)
	{
		Map<String, Object> params = buildParamMap();
		params.put("id", id);

		SqlDataSetEntity entity = selectOneMybatis("getSqlDataSetEntityById", params);

		return entity;
	}

	protected JsonValueDataSetEntity getJsonValueDataSetEntityById(String id)
	{
		Map<String, Object> params = buildParamMap();
		params.put("id", id);

		JsonValueDataSetEntity entity = selectOneMybatis("getJsonValueDataSetEntityById", params);

		return entity;
	}

	protected JsonFileDataSetEntity getJsonFileDataSetEntityById(String id)
	{
		Map<String, Object> params = buildParamMap();
		params.put("id", id);

		JsonFileDataSetEntity entity = selectOneMybatis("getJsonFileDataSetEntityById", params);

		if (entity != null)
			entity.setDirectory(getDataSetDirectory(id));

		return entity;
	}

	protected ExcelDataSetEntity getExcelDataSetEntityById(String id)
	{
		Map<String, Object> params = buildParamMap();
		params.put("id", id);

		ExcelDataSetEntity entity = selectOneMybatis("getExcelDataSetEntityById", params);

		if (entity != null)
			entity.setDirectory(getDataSetDirectory(id));

		return entity;
	}

	protected CsvValueDataSetEntity getCsvValueDataSetEntityById(String id)
	{
		Map<String, Object> params = buildParamMap();
		params.put("id", id);

		CsvValueDataSetEntity entity = selectOneMybatis("getCsvValueDataSetEntityById", params);

		return entity;
	}

	protected CsvFileDataSetEntity getCsvFileDataSetEntityById(String id)
	{
		Map<String, Object> params = buildParamMap();
		params.put("id", id);

		CsvFileDataSetEntity entity = selectOneMybatis("getCsvFileDataSetEntityById", params);

		if (entity != null)
			entity.setDirectory(getDataSetDirectory(id));

		return entity;
	}

	protected HttpDataSetEntity getHttpDataSetEntityById(String id)
	{
		Map<String, Object> params = buildParamMap();
		params.put("id", id);

		HttpDataSetEntity entity = selectOneMybatis("getHttpDataSetEntityById", params);

		if (entity != null)
			entity.setHttpClient(this.httpClient);

		return entity;
	}

	@Override
	protected DataSetEntity postProcessGet(DataSetEntity obj)
	{
		inflateAnalysisProjectAwareEntity(obj, this.analysisProjectService);
		inflateCreateUserEntity(obj, this.userService);

		if (obj instanceof DirectoryFileDataSetEntity)
			inflateDirectoryFileDataSetEntity((DirectoryFileDataSetEntity) obj, this.dataSetResDirectoryService);

		if (obj instanceof SqlDataSetEntity)
		{
			SqlDataSetEntity entity = (SqlDataSetEntity) obj;

			SchemaConnectionFactory connectionFactory = entity.getConnectionFactory();
			Schema schema = (connectionFactory == null ? null : connectionFactory.getSchema());
			String schemaId = (schema == null ? null : schema.getId());

			if (!StringUtil.isEmpty(schemaId))
				connectionFactory.setSchema(this.schemaService.getById(schemaId));
		}

		return super.postProcessGet(obj);
	}

	@Override
	protected void addDataPermissionParameters(Map<String, Object> params, User user)
	{
		super.addDataPermissionParameters(params, user);
		params.put(AnalysisProjectAwareEntity.DATA_PERMISSION_PARAM_RESOURCE_TYPE_ANALYSIS_PROJECT,
				AnalysisProject.AUTHORIZATION_RESOURCE_TYPE);
	}

	@Override
	protected String getSqlNamespace()
	{
		return SQL_NAMESPACE;
	}

	protected void saveDataSetChildren(DataSetEntity entity)
	{
		saveDataSetPropertyPOs(entity);
		saveDataSetParamPOs(entity);
	}

	protected void saveDataSetPropertyPOs(DataSetEntity entity)
	{
		if (entity == null)
			return;

		Map<String, Object> delParams = buildParamMap();
		delParams.put("dataSetId", entity.getId());

		deleteMybatis("deletePropertyPOs", delParams);

		List<DataSetPropertyPO> pos = DataSetPropertyPO.from(entity);

		if (!pos.isEmpty())
		{
			for (DataSetPropertyPO relation : pos)
			{
				Map<String, Object> insertParams = buildParamMap();
				insertParams.put("entity", relation);

				insertMybatis("insertPropertyPO", insertParams);
			}
		}
	}

	protected void saveDataSetParamPOs(DataSetEntity entity)
	{
		if (entity == null)
			return;

		Map<String, Object> delParams = buildParamMap();
		delParams.put("dataSetId", entity.getId());

		deleteMybatis("deleteParamPOs", delParams);

		List<DataSetParamPO> pos = DataSetParamPO.from(entity);

		if (!pos.isEmpty())
		{
			for (DataSetParamPO relation : pos)
			{
				Map<String, Object> insertParams = buildParamMap();
				insertParams.put("entity", relation);

				insertMybatis("insertParamPO", insertParams);
			}
		}
	}

	public static abstract class DataSetChildPO<T>
	{
		private String dataSetId;
		private T child;
		private int order = 0;

		public DataSetChildPO()
		{
			super();
		}

		public DataSetChildPO(String dataSetId, T child, int order)
		{
			super();
			this.dataSetId = dataSetId;
			this.child = child;
			this.order = order;
		}

		public String getDataSetId()
		{
			return dataSetId;
		}

		public void setDataSetId(String dataSetId)
		{
			this.dataSetId = dataSetId;
		}

		public T getChild()
		{
			return child;
		}

		public void setChild(T child)
		{
			this.child = child;
		}

		public int getOrder()
		{
			return order;
		}

		public void setOrder(int order)
		{
			this.order = order;
		}

		public static <T> List<T> to(List<? extends DataSetChildPO<T>> pos)
		{
			List<T> childs = new ArrayList<>();

			if (pos != null)
			{
				for (DataSetChildPO<T> po : pos)
					childs.add(po.getChild());
			}

			return childs;
		}
	}

	public static class DataSetPropertyPO extends DataSetChildPO<DataSetProperty>
	{
		public DataSetPropertyPO()
		{
			super();
		}

		public DataSetPropertyPO(String dataSetId, DataSetProperty child, int order)
		{
			super(dataSetId, child, order);
		}

		@Override
		public DataSetProperty getChild()
		{
			return super.getChild();
		}

		@Override
		public void setChild(DataSetProperty child)
		{
			super.setChild(child);
		}

		public static List<DataSetPropertyPO> from(DataSet dataSet)
		{
			List<DataSetPropertyPO> pos = new ArrayList<>();

			List<DataSetProperty> properties = dataSet.getProperties();

			if (properties != null)
			{
				for (int i = 0; i < properties.size(); i++)
				{
					DataSetPropertyPO po = new DataSetPropertyPO(dataSet.getId(), properties.get(i), i);
					pos.add(po);
				}
			}

			return pos;
		}
	}

	public static class DataSetParamPO extends DataSetChildPO<DataSetParam>
	{
		public DataSetParamPO()
		{
			super();
		}

		public DataSetParamPO(String dataSetId, DataSetParam child, int order)
		{
			super(dataSetId, child, order);
		}

		@Override
		public DataSetParam getChild()
		{
			return super.getChild();
		}

		@Override
		public void setChild(DataSetParam child)
		{
			super.setChild(child);
		}

		public static List<DataSetParamPO> from(DataSet dataSet)
		{
			List<DataSetParamPO> pos = new ArrayList<>();

			List<DataSetParam> params = dataSet.getParams();

			if (params != null)
			{
				for (int i = 0; i < params.size(); i++)
				{
					DataSetParamPO po = new DataSetParamPO(dataSet.getId(), params.get(i), i);
					pos.add(po);
				}
			}

			return pos;
		}
	}
}
