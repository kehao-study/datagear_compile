/*
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 */

package org.datagear.util;

import java.io.Serializable;
import java.util.Iterator;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

/**
 * 基于星号模式（{@code *}，表示任意个任意字符）的匹配器。
 * <p>
 * 匹配规则如下：
 * </p>
 * <ul>
 * <li>{@code *}<br>
 * 匹配任意字符串</li>
 * <li>{@code *abc}<br>
 * 匹配以{@code abc}结尾的字符串</li>
 * <li>{@code abc*}<br>
 * 匹配以{@code abc}开头的字符串</li>
 * <li>{@code abc*def}<br>
 * 匹配以{@code abc}开头、以{@code def}结尾的字符串</li>
 * <li>{@code *abc*def*}<br>
 * 匹配依次包含{@code abc}、{@code def}的字符串</li>
 * </ul>
 * 
 * @author datagear@163.com
 *
 */
public class AsteriskPatternMatcher
{
	private CopyOnWriteArrayList<AsteriskRegexPattern> asteriskRegexPatternCache = new CopyOnWriteArrayList<AsteriskRegexPattern>();

	private int cacheSize = 100;

	public AsteriskPatternMatcher()
	{
		super();
	}

	protected int getCacheSize()
	{
		return cacheSize;
	}

	protected void setCacheSize(int cacheSize)
	{
		this.cacheSize = cacheSize;
	}

	/**
	 * 是否匹配。
	 * 
	 * @param asteriskPattern
	 *            星号模式字符串
	 * @param text
	 *            要匹配的字符串
	 * @return
	 */
	public boolean matches(String asteriskPattern, String text)
	{
		Pattern rp = getRegexPattern(asteriskPattern);
		return rp.matcher(text).matches();
	}

	protected Pattern getRegexPattern(String asteriskPattern)
	{
		Iterator<AsteriskRegexPattern> it = this.asteriskRegexPatternCache.iterator();
		while (it.hasNext())
		{
			AsteriskRegexPattern arp = it.next();

			if (arp.getAsteriskPattern().equals(asteriskPattern))
				return arp.getRegexPattern();
		}

		Pattern rp = buildRegexPattern(asteriskPattern);

		AsteriskRegexPattern arp = new AsteriskRegexPattern(asteriskPattern, rp);
		this.asteriskRegexPatternCache.add(arp);

		while (this.asteriskRegexPatternCache.size() > this.cacheSize)
			this.asteriskRegexPatternCache.remove(0);

		return rp;
	}

	/**
	 * 将星号模式字符串转换为正则字符串。
	 * 
	 * @param asteriskPattern
	 * @return
	 */
	protected Pattern buildRegexPattern(String asteriskPattern)
	{
		StringBuilder pb = new StringBuilder();

		pb.append('^');

		char[] cs = asteriskPattern.toCharArray();
		StringBuilder lb = new StringBuilder();
		for (int i = 0; i < cs.length; i++)
		{
			char c = cs[i];

			if (c == '*')
			{
				if (lb.length() > 0)
				{
					pb.append(Pattern.quote(lb.toString()));
					lb.delete(0, lb.length());
				}

				pb.append(".*");
			}
			else
				lb.append(c);
		}

		if (lb.length() > 0)
			pb.append(Pattern.quote(lb.toString()));

		pb.append('$');

		String regex = pb.toString();

		return Pattern.compile(regex);
	}

	private static class AsteriskRegexPattern implements Serializable
	{
		private static final long serialVersionUID = 1L;

		private final String asteriskPattern;

		private final Pattern regexPattern;

		public AsteriskRegexPattern(String asteriskPattern, Pattern regexPattern)
		{
			super();
			this.asteriskPattern = asteriskPattern;
			this.regexPattern = regexPattern;
		}

		public String getAsteriskPattern()
		{
			return asteriskPattern;
		}

		public Pattern getRegexPattern()
		{
			return regexPattern;
		}

		@Override
		public int hashCode()
		{
			final int prime = 31;
			int result = 1;
			result = prime * result + ((asteriskPattern == null) ? 0 : asteriskPattern.hashCode());
			return result;
		}

		@Override
		public boolean equals(Object obj)
		{
			if (this == obj)
				return true;
			if (obj == null)
				return false;
			if (getClass() != obj.getClass())
				return false;
			AsteriskRegexPattern other = (AsteriskRegexPattern) obj;
			if (asteriskPattern == null)
			{
				if (other.asteriskPattern != null)
					return false;
			}
			else if (!asteriskPattern.equals(other.asteriskPattern))
				return false;
			return true;
		}
	}
}
