(function (ci, src, a) {
    var w = window,
        d = document,
        ot, z, ef = w[ci] = function () {
            return ef.q.push(arguments);
        };
    ef.q = [];
    ef.a = a || {};
    ot = d.createElement("script");
    ot.id = "ob-script-async";
    ot.async = true;
    ot.src = src;
    ot.setAttribute('data-efname', ci);
    var t = document.createAttribute("a");
    t.nodeValue = ef.a.tenantId;
    ot.attributes.setNamedItem(t);
    z = d.getElementsByTagName("script")[0];
    z.parentNode.insertBefore(ot, z);
    return ef;
})('ci360', 'https://cixctn.produbanco.com/js/ot-all.min.js', {
    tenantId: (typeof tenantIdSAS !== 'undefined') ? tenantIdSAS : ''
});