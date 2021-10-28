/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

package org.datagear.web.freemarker;

import java.io.IOException;
import java.util.Map;

import org.datagear.analysis.support.JsonSupport;
import org.datagear.web.json.jackson.ObjectMapperBuilder;

import com.fasterxml.jackson.databind.ObjectMapper;

import freemarker.core.Environment;
import freemarker.ext.util.WrapperTemplateModel;
import freemarker.template.TemplateBooleanModel;
import freemarker.template.TemplateDirectiveBody;
import freemarker.template.TemplateDirectiveModel;
import freemarker.template.TemplateException;
import freemarker.template.TemplateModel;
import freemarker.template.TemplateModelException;
import freemarker.template.utility.DeepUnwrap;

/**
 * 将参数输出为JSON的{@linkplain WriteJsonTemplateDirectiveModel}。
 * 
 * @author datagear@163.com
 *
 */
public class WriteJsonTemplateDirectiveModel implements TemplateDirectiveModel
{
	public static final String KEY_VAR = "var";
	public static final String KEY_BIG_NUMBER_TO_STRING = "bigNumberToString";

	private ObjectMapperBuilder objectMapperBuilder;

	private ObjectMapper _objectMapper;

	private ObjectMapper _objectMapperForBigNumberToString;

	public WriteJsonTemplateDirectiveModel()
	{
		super();
	}

	public WriteJsonTemplateDirectiveModel(ObjectMapperBuilder objectMapperBuilder)
	{
		super();
		setObjectMapperBuilder(objectMapperBuilder);
	}

	public ObjectMapperBuilder getObjectMapperBuilder()
	{
		return objectMapperBuilder;
	}

	public void setObjectMapperBuilder(ObjectMapperBuilder objectMapperBuilder)
	{
		this.objectMapperBuilder = objectMapperBuilder;
		this._objectMapper = this.objectMapperBuilder.build();
		this._objectMapperForBigNumberToString = this.objectMapperBuilder.buildForBigNumberToString();
		JsonSupport.disableAutoCloseTargetFeature(this._objectMapper);
		JsonSupport.disableAutoCloseTargetFeature(this._objectMapperForBigNumberToString);
	}

	@SuppressWarnings("rawtypes")
	@Override
	public void execute(Environment env, Map params, TemplateModel[] loopVars, TemplateDirectiveBody body)
			throws TemplateException, IOException
	{
		TemplateModel var = (TemplateModel)params.get(KEY_VAR);
		TemplateBooleanModel bigNumberToStringObj = (TemplateBooleanModel) params.get(KEY_BIG_NUMBER_TO_STRING);
		boolean bigNumberToString = (bigNumberToStringObj == null ? false : bigNumberToStringObj.getAsBoolean());

		Object obj = unwrap(var);

		try
		{
			if (bigNumberToString)
			{
				this._objectMapperForBigNumberToString.writeValue(env.getOut(), obj);
			}
			else
			{
				this._objectMapper.writeValue(env.getOut(), obj);
			}
		}
		catch (IOException e)
		{
			throw e;
		}
		catch (Throwable t)
		{
			throw new TemplateException(t, env);
		}
	}

	/**
	 * 获取{@linkplain TemplateModel}的原始对象。
	 * <p>
	 * 由于freemarker的{@linkplain DeepUnwrap}处理存在循环引用的对象时会出现死循环，因而不能采用，
	 * 这里折中一下，要求此指令的参数对象必须是{@linkplain WrapperTemplateModel}。
	 * </p>
	 * 
	 * @param model
	 * @return
	 * @throws TemplateModelException
	 */
	protected Object unwrap(TemplateModel model) throws TemplateModelException
	{
		if (model == null)
			return null;

		if (model instanceof WrapperTemplateModel)
		{
			return ((WrapperTemplateModel) model).getWrappedObject();
		}

		throw new TemplateModelException("Cannot unwrap model of type " + model.getClass().getName());
	}

	/**
	 * 将对象包装为{@linkplain WrapperTemplateModel}，这样就可以使用此类对应的指令，并且能够处理循环引用对象。
	 * 
	 * @param obj
	 *            允许为{@code null}
	 * @return
	 */
	public static TemplateModel toWriteJsonTemplateModel(Object obj)
	{
		return new SimpleWrapperTemplateModel(obj);
	}

	protected static class SimpleWrapperTemplateModel implements WrapperTemplateModel
	{
		private Object object;

		public SimpleWrapperTemplateModel()
		{
			super();
		}

		public SimpleWrapperTemplateModel(Object object)
		{
			super();
			this.object = object;
		}

		public Object getObject()
		{
			return object;
		}

		public void setObject(Object object)
		{
			this.object = object;
		}

		@Override
		public Object getWrappedObject()
		{
			return object;
		}
	}
}
