export class mx {

    public static HTML_LINK_NAME = "Link";
    public static HTML_MAGNET_LINK_NAME = "Magnet Link";

    //
    public static checkInvalidHTMLCharacters = (text:string) => {
        return /[<>{}#*~`]/g.test(text);
    }
    
    // text 中不能存在<>和{}
    // text 的换行符全部替换为<br />
    public static text2InnerHtml = (text:string) => {

        // 将可能会被冒充使用html的标签全部替换为空格
        // 避免标签滥用
        // 假如做了转义，一律删除
        text = text.replace(/([<].*[>])|([{].*[}])/g, " ");
        
        // 替换换行符
        text = text.replace(/[(\r\n)|(\n)]/g, "<br/>");
        // 替换退格键
        text = text.replace(/[\t]/g, "&nbsp;&nbsp;");
        // 替换空格
        text = text.replace(/[\s]/g, "&nbsp;");
        // 替换HTML LINK标签
        let ar = text.match(/\[URL:[^\[\]]+]/ig);
        if(ar && ar.length > 0) {
            ar.forEach(v => {
                let url = v.replace("[URL:", "").replace("]", "").trim();
                text = text.replace(v, `&nbsp;<input type="button" title="${url}" value="${mx.HTML_LINK_NAME}" onclick="window.open('${url}');"/>`);
            })
        }
        // 替换MAGNET LINK标签
        ar = text.match(/\[MNL:[^\[\]]+]/ig);
        if(ar && ar.length > 0) {
            ar.forEach(v => {
                let url = v.replace("[MNL:", "").replace("]", "").trim();
                text = text.replace(v, `&nbsp;<input type="button" title="${url}" value="${mx.HTML_MAGNET_LINK_NAME}" class="clazz-clipborad" data-clipboard-text="${url}"
                onclick="clipboardx_init()"
                />`);
            })
        }
        return text;
    }
}

//
export default mx;