<#--
 *
 * Copyright 2018 datagear.tech
 *
 * Licensed under the LGPLv3 license:
 * http://www.gnu.org/licenses/lgpl-3.0.html
 *
-->
<#include "../include/import_global.ftl">
<#include "../include/html_doctype.ftl">
<#--
titleMessageKey 标题标签I18N关键字，不允许null
formAction 表单提交action，允许为null
readonly 是否只读操作，允许为null
-->
<#assign formAction=(formAction!'#')>
<#assign readonly=(readonly!false)>
<#assign isAdd=(formAction == 'saveAdd')>
<html>
<head>
<#include "../include/html_head.ftl">
<title><#include "../include/html_title_app_name.ftl"><@spring.message code='${titleMessageKey}' /></title>
</head>
<body>
<#include "../include/page_js_obj.ftl" >
<div id="${pageId}" class="page-form page-form-schemaGuard">
	<form id="${pageId}-form" action="${contextPath}/schemaGuard/${formAction}" method="POST">
		<div class="form-head"></div>
		<div class="form-content">
			<input type="hidden" name="id" value="${(schemaGuard.id)!''}" />
			<div class="form-item">
				<div class="form-item-label">
					<label title="<@spring.message code='schemaGuard.pattern.desc' />">
						<@spring.message code='schemaGuard.pattern' />
					</label>
				</div>
				<div class="form-item-value">
					<input type="text" name="pattern" value="${(schemaGuard.pattern)!''}" class="ui-widget ui-widget-content" />
				</div>
			</div>
			<div class="form-item">
				<div class="form-item-label">
					<label title="<@spring.message code='schemaGuard.permitted.desc' />">
						<@spring.message code='schemaGuard.permitted' />
					</label>
				</div>
				<div class="form-item-value">
					<div class="schemaGuardPermitted-radios">
					<label for="${pageId}-schemaGuardPermittedYes"><@spring.message code='yes' /></label>
		   			<input type="radio" id="${pageId}-schemaGuardPermittedYes" name="permitted" value="true" <#if (schemaGuard.permitted)!false>checked="checked"</#if> />
					<label for="${pageId}-schemaGuardPermittedNo"><@spring.message code='no' /></label>
		   			<input type="radio" id="${pageId}-schemaGuardPermittedNo" name="permitted" value="false" <#if !((schemaGuard.permitted)!false)>checked="checked"</#if> />
		   			</div>
				</div>
			</div>
			<div class="form-item">
				<div class="form-item-label">
					<label title="<@spring.message code='schemaGuard.priority.desc' />">
						<@spring.message code='schemaGuard.priority' />
					</label>
				</div>
				<div class="form-item-value">
					<input type="text" name="priority" class="ui-widget ui-widget-content" value="${(schemaGuard.priority)!''}" />
				</div>
			</div>
			<div class="form-item">
				<div class="form-item-label">
					<label><@spring.message code='schemaGuard.enabled' /></label>
				</div>
				<div class="form-item-value">
					<div class="schemaGuardEnabled-radios">
					<label for="${pageId}-schemaGuardEnabledYes"><@spring.message code='yes' /></label>
		   			<input type="radio" id="${pageId}-schemaGuardEnabledYes" name="enabled" value="true" <#if (schemaGuard.enabled)!false>checked="checked"</#if> />
					<label for="${pageId}-schemaGuardEnabledNo"><@spring.message code='no' /></label>
		   			<input type="radio" id="${pageId}-schemaGuardEnabledNo" name="enabled" value="false" <#if !((schemaGuard.enabled)!false)>checked="checked"</#if> />
		   			</div>
				</div>
			</div>
		</div>
		<div class="form-foot" style="text-align:center;">
			<#if !readonly>
			<input type="submit" value="<@spring.message code='save' />" class="recommended" />
			</#if>
		</div>
	</form>
</div>
<#include "../include/page_obj_form.ftl">
<script type="text/javascript">
(function(po)
{
	$.initButtons(po.element());
	po.element("input[name='permitted']").checkboxradio({icon:false});
	po.element(".schemaGuardPermitted-radios").controlgroup();

	po.element("input[name='enabled']").checkboxradio({icon:false});
	po.element(".schemaGuardEnabled-radios").controlgroup();
	
	po.url = function(action)
	{
		return "${contextPath}/schemaGuard/" + action;
	};
	
	<#if !readonly>
	po.form().validate(
	{
		rules :
		{
			pattern : "required",
			priority : "integer"
		},
		messages :
		{
			pattern : "<@spring.message code='validation.required' />",
			priority : "<@spring.message code='validation.integer' />"
		},
		submitHandler : function(form)
		{
			var data = $.formToJson(form);
			
			$.ajaxJson($(form).attr("action"),
			{
				data: data,
				success : function(response)
				{
					po.pageParamCallAfterSave(true, response.data);
				}
			});
		},
		errorPlacement : function(error, element)
		{
			error.appendTo(element.closest(".form-item-value"));
		}
	});
	</#if>
})
(${pageId});
</script>
</body>
</html>