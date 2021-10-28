/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

package org.datagear.management.util.dialect;

/**
 * MySQL 方言。
 * 
 * @author datagear@163.com
 *
 */
public class MysqlMbSqlDialect extends MbSqlDialect
{
	public MysqlMbSqlDialect()
	{
		super();
	}

	public MysqlMbSqlDialect(String identifierQuote)
	{
		super(identifierQuote);
	}

	@Override
	public boolean supportsPaging()
	{
		return true;
	}

	@Override
	public String pagingSqlHead(int index, int fetchSize)
	{
		return "SELECT PGQ.* FROM (";
	}

	@Override
	public String pagingSqlFoot(int index, int fetchSize)
	{
		return ") PGQ LIMIT " + index + "," + fetchSize;
	}
}
