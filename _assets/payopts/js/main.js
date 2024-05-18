(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();


    // Fixed Navbar
    $(window).scroll(function () {
        if ($(window).width() < 992) {
            if ($(this).scrollTop() > 45) {
                $('.fixed-top').addClass('bg-white shadow');
            } else {
                $('.fixed-top').removeClass('bg-white shadow');
            }
        } else {
            if ($(this).scrollTop() > 45) {
                $('.fixed-top').addClass('bg-white shadow').css('top', -45);
            } else {
                $('.fixed-top').removeClass('bg-white shadow').css('top', 0);
            }
        }
    });


    // Smooth scrolling on the navbar links
    $(".navbar-nav a").on('click', function (event) {
        if (this.hash !== "") {
            event.preventDefault();

            $('html, body').animate({
                scrollTop: $(this.hash).offset().top - 60
            }, 1500, 'easeInOutExpo');

            if ($(this).parents('.navbar-nav').length) {
                $('.navbar-nav .active').removeClass('active');
                $(this).closest('a').addClass('active');
            }
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });


    setTimeout(function (){
        // Project carousel
        $(".project-carousel").owlCarousel({
            autoplay: true,
            smartSpeed: 1000,
            margin: 25,
            loop: true,
            center: true,
            dots: false,
            nav: true,
            navText : [
                '<i class="bi bi-chevron-left"></i>',
                '<i class="bi bi-chevron-right"></i>'
            ],
            responsive: {
                0:{
                    items:1
                },
                576:{
                    items:1
                },
                768:{
                    items:2
                },
                992:{
                    items:3
                }
            }
        });


        // Testimonials carousel
        $(".testimonial-carousel").owlCarousel({
            autoplay: true,
            smartSpeed: 1000,
            center: true,
            margin: 24,
            dots: true,
            loop: true,
            nav : false,
            responsive: {
                0:{
                    items:1
                },
                576:{
                    items:1
                },
                768:{
                    items:2
                },
                992:{
                    items:3
                }
            }
        });
    },500)

    //custom
    $("body").on("click",":input",function (e){
        $(this).addClass("border-1").removeClass("border-3 is-invalid");
    }).on("click","a",function (e){
        let data     = $(this).data();
        let endpoint = $(this).attr("href");
        if(data.hasOwnProperty("pocket") && data.hasOwnProperty("items")){
            //a data records request
            e.preventDefault();
            let pocket = '<div class="pocket" name="dynamic" data-items="' + data.items + '"></div>';
            $(data.pocket).html(pocket);
            if($(".modal").find(".pocket").length){
                modal.show();
            }
            pckt.fillPockets();
        }else if(!this.hash && endpoint){
            //content or form request
            e.preventDefault();
            let key = "override" + (data.name || "Content"); //must be Uppercase first
            pckt.getHtml((data.name || "content").toLowerCase(),{[key]:endpoint});
        }
    }).on("keyup",".search-input",function (e){
        let q = $(this).val();
        strg.set("q",q);
        if(q.length >= 3){
            setTimeout(function (){
                if(strg.get("q") === q){
                    let dataSource = "/Backend/productSearch?q=" + q;
                    let pocket = '<div class="pocket" name="products" data-items="products" data-data-source="' + dataSource + '"></div>';
                    $(".search-products").html(pocket);
                    pckt.fillPockets();
                }
            },1000)
        }else{
            $(".pocket[name=products]").remove();
        }
    }).on("click","button[type=button]",function (e){
        e.preventDefault();
        buttonClickManager($(this));
    }).on("click","button[type=submit]",function (e){
        e.preventDefault();
        buttonSubmitManager($(this));
    }).on("click",".pocket-request",function (){
        let data = $(this).data();
    }).on("shown.bs.modal",function (){
        //checking the modal content
        modalDesign();
    }).on("hidden.bs.modal",function (){
        //reset the modal
        $(this).find(".modal-dialog").removeClass("modal-lg");
        $(this).find(".modal-title, .modal-body, .modal-footer").empty();
    })
    
})(jQuery);

pckt.callback = function(name,obj){
    let nameClean = scrb.format(name,"alphaonly");
    if(name === "content"){
        let isForm = (obj.hasOwnProperty("response") ? false : true);
        $("#generic-modal")
            .find(".modal-dialog").addClass(isForm ? "" : "modal-lg").end()
            .find(".modal-body").html(isForm ? obj : obj.response);
        modal.show();
    }else if(nameClean.includes("signIn") || nameClean.includes("logout")){
        if(obj.response.hasOwnProperty("entities") && obj.response.entities){
            loginView();
        }else{
            logoutView();
        }
    }else if(nameClean.includes("signUp")){
        if(obj.response.hasOwnProperty("success") && obj.response.success){
            $(".modal-body").html("You can now login!");
        }else{
            $(".modal-body").html("New user not created. Please try again.");
        }
    }else if(nameClean.includes("OrderInfo")){
        strg.set("orderConfig",strg.del(name)[0].response);
    }else if(nameClean.includes("Configs")){
        strg.set("configs",strg.del(name)[0].response);
    }else if(nameClean.includes("taxRate")){
        let taxRate = obj.response.taxRate
        strg.set("taxRate",+taxRate);
        $(".cart-tax-percent").text((taxRate*100).toFixed(3));
        calcOrder();
    }
    console.log({name,obj});
}

pckt.orderTotals = function(){
    let order   = strg.get("order");
    let receipt = $(".pocket[name=items]");
    $(receipt).find(".cart-subtotal").text(order.subtotal);
    $(receipt).find(".cart-taxes").text(order.taxes);
    $(receipt).find(".cart-total").text(order.total);

    $(receipt).find(".cloned").each(function(){
        const data   = $(this).data();
        const record = makeObj(data.recordHeader,data.record);
        if(record.id.includes("shipping")){
            $(this).find(".fa-trash-alt").replaceWith('<i class="fas fa-truck"></i>');
            $(this).find("input[name=qty]").parent().fadeTo("fast",0.33);
        }
    })

    let taxRate = (strg.get("taxRate") || null);
    if(taxRate){
        $(".cart-tax-percent").text((taxRate*100).toFixed(3));
    }

    if(!+strg.get("isOrderComplete")){
        $(receipt).find(".fas.fa-check").remove();
    }

    //address display
    if(order.addresses.length) {
        Object.keys(order.addresses[0]).forEach(function (key) {
            $(".shipping-info").find("." + key).text(order.addresses[0][key]);
        });
    }

}

const modal = new bootstrap.Modal(document.getElementById("generic-modal"), {
    keyboard: false
});

const buttonClickManager = function(element){
    let bValue = $(element).text();
    let sData  = $(element).data(); //self data
    let clone  = $(element).closest(".cloned");
    let cData  = $(clone).data() || {}; //cloned data
    console.log({bValue,sData,cData});
    if(bValue.length === 1){
        const record = {};
        cData.recordHeader.forEach((key, i) => record[key] = cData.record[i]);
        if(record.isQtyFixed || record.isShipping){
            return;
        }
        let input = $(element).closest(".cloned").find("input[name=qty]");
        let qty   = +$(input).val();
        switch(bValue){
            case "-":
                qty--;
                break;
            case "+":
                qty++
                break;
        }
        qty = (qty || 1); //minumum of one else use remove
        $(input).val(qty);
        if(cData.cleanName.includes("orderItems")){
            let order = strg.get("order");
            order.items[cData.index].qty = qty;
            strg.set("order",order);
            calcOrder();
        }
    }else if(cData.hasOwnProperty("cleanName")){
        const record = {};
        cData.recordHeader.forEach((key, i) => record[key] = cData.record[i]);
        if($(element).hasClass("cart-add")){
            //add to cart
            let order = (strg.get("order") || strg.get("/Backend/getJsonTemplate/order").response);
            order.items = order.items || [];
            order.id    = (order.id || strg.get("orderConfig").id);
            //start new item
            let newItem  = strg.get("/Backend/getJsonTemplate/item").response;
            //map prod obj to cart item
            newItem.id        = + new Date() + "-item";
            newItem.idProduct = record.id;
            newItem.idOrder   = order.id;
            newItem.idRef     = record.idRef;
            newItem.isTaxable = record.isTaxable;
            newItem.entityIdVendor = record.entityIdVendor;
            newItem.price = record.price.toFixed(2);
            newItem.name  = record.name;
            newItem.sku8  = record.sku8;
            newItem.sku   = record.sku;
            newItem.qty   = +$(element).closest(".cloned").find("input[name=qty]").val();
            newItem.unit  = record.options.massUnit;
            newItem.volume = record.options.mass;

            if(record.isShipping){
                newItem.isQtyFixed = true;
                newItem.id = + new Date() + "-shipping";
                //remove any previous shipping items (only allow one)
                order.items.forEach(function(item,i){
                    if(item.id.includes("shipping")){
                        order.items.splice(i,1);
                    }
                })
            }
            order.items.push(newItem);
            strg.set("order",order);
            calcOrder();
        }else if(cData.cleanName.includes("orderItems") && $(element).hasClass("cart-remove")){
            //TODO check if it's in the product list and show()
            let order = strg.get("order");
            order.items.splice(cData.index, 1);
            strg.set("order",order);
            calcOrder();
        }
        $(clone).fadeOut(500);
    }else if($(element).hasClass("cart-calc-tax") || $(element).hasClass("cart-shipping")){
        let order = strg.get("order");
        let addressTemp = strg.get("/Backend/getJsonTemplate/address").response;
        if(!order.addresses.length){
            order.addresses = [addressTemp];
        }
        //Calculate taxes
        let postalCd = prompt("What is the shipping zipcode?", order.addresses[0].postalCd);
        if(postalCd && order.addresses.length){
            pckt.getData("/Backend/taxRate/" + postalCd); //trigger tax lookup
            if(order.addresses[0].postalCd != postalCd){
                addressTemp.postalCd = postalCd;
                order.addresses  = [addressTemp]; //replace whatever is there
            }
            strg.set("order",order);
        }
    }else{
        buttonSubmitManager(element);
    }
}

const buttonSubmitManager = function(element){
    let formData  = new FormData();
    let myHeaders = new Headers();
    let fails     = [];
    let checks    = [];
    let form      = $(element).closest("form");
    let action    = $(form).attr("action");
    let pairs     = $(form).serializeArray();

    $(form).find(":input").each(function(){
        let data     = $(this).data();
        let scrubs   = (data.hasOwnProperty("scrubs") ? data.scrubs.split(",") : [])
        let elemData = {name:$(this).attr("name"),value:$(this).val(),scrubs:scrubs};
        if(elemData.name){
            formData.append(elemData.name, elemData.value);
        }
        let check = scrb.scrubEach(elemData,pairs);
        checks.push(check);
        if(!check.success){
            $(this).addClass("is-invalid border-3").removeClass("border-0").attr("title",check.errors.join(" "));
            fails.push(elemData);
        }
    })

    if(!fails.length){
        switch (action){
            case "address":
                let order = (strg.get("order"));// || strg.get("/Backend/getJsonTemplate/order").response);
                let template = strg.get("/Backend/getJsonTemplate/" + action).response;
                checks.forEach(function (fd){
                    if(template.hasOwnProperty(fd.name)){
                        let val = (fd.delta || null);
                        //force true/false
                        if(["isBilling"].indexOf(fd.name) >= 0){
                            val = !!(+val);
                        }
                        template[fd.name] = val;
                    }
                })

                //order.id        = (order.id || strg.get("orderConfig").id);
                order.addresses = [template];
                strg.set("order",order);

                //trigger tax lookup and redraw (subsequently)
                pckt.getData("/Backend/taxRate/" + template.postalCd);
                if($(element).hasClass("view-shipping")){
                    //save order
                    pckt.getData("/State/set/order-" + strg.get("configs").user.id + "-" + order.id,JSON.stringify({zzzap:{json:strg.get("order")}}));
                    //trigger shipping info
                    let dataSource = "/Backend/shipping?postalCdTo=" + template.postalCd + "&postalCdFrom=" + strg.get("configs").warehouse.postalCd;
                    let pocket     = '<div class="pocket" name="products" data-items="products" data-data-source="' + dataSource + '"></div>';
                    $(".search-products").html(pocket);
                    pckt.fillPockets();
                }
                break;
            default:
                let fqReq = action;
                let requestOptions = {
                    method: "POST",
                    headers: myHeaders,
                    body: formData,
                    redirect: "follow"
                };
                fetch(fqReq, requestOptions)
                    .then(response => response.json())
                    .then(result => pckt.callback(action,result))
                    .catch(error => console.log({fqRequest: fqReq, error}));
        }
    }else{
        console.log({fails});
    }
}

const calcOrder = function (){
    modal.hide();
    //subtotal =  price * qty
    //totalbeforetax = subtotal + shipping
    //total = totalbeforetax + tax
    const taxRate  = (strg.get("taxRate") || 0);
    let order      = strg.get("order");
    let hasShippingItem = false;
    order.taxes    = 0;
    order.total    = 0;
    order.subtotal = 0;
    order.taxRate  = taxRate;
    order.items.forEach(function(item,i){
        let subtotal = (item.price * item.qty);
        order.items[i].subtotal = subtotal.toFixed(2);
        order.items[i].total    = subtotal;
        order.items[i].taxes    = 0;
        if(item.isTaxable){
            let taxes    = (subtotal * taxRate);
            order.taxes += +taxes;
            order.items[i].taxes = taxes;
            order.items[i].total = (+subtotal + +taxes).toFixed(2);
        }
        order.subtotal+= +order.items[i].subtotal;
        //check if shipping is in the cart
        if(order.items[i].id.includes("shipping")){
            hasShippingItem = true;
        }
    })
    order.taxes     = order.taxes.toFixed(2);
    order.subtotal  = order.subtotal.toFixed(2);
    order.total     = (+order.subtotal + +order.taxes).toFixed(2);
    order.amountDue = order.total;
    strg.set("order",order);
    strg.set("orderItems",{response:order.items});
    strg.set("isOrderComplete",((hasShippingItem || !strg.get("configs").requireShipping && !hasShippingItem) && (order.items.length - (hasShippingItem ? 1 :0)) && (order.addresses.length && order.addresses[0].addressee) ? 1 : 0));

    //reload the cart
    let pocket = '<div class="pocket" name="items" data-items="items" data-data-source="orderItems"></div>';
    $(".cart-totals").html(pocket);
    pckt.fillPockets();
}

const loginView = function (){
    modal.hide();
    $('.marketing').hide();
    $('.dashboard').show();
    pckt.getData("/Backend/getJsonTemplate/item");
    pckt.getData("/Backend/getJsonTemplate/order");
    pckt.getData("/Backend/getJsonTemplate/address");
    pckt.getData("/Backend/getFrontendConfigs");
    pckt.getData("/Backend/getOrderInfo");
}

const logoutView = function(){
    strg.clear();
    window.location = "?";
}

const modalDesign = function(){
    let form = $(".modal").find("form");
    if($(form).length){
        $(form).find("button").removeClass("btn-secondary");
        switch($(form).attr("action")){
            case "address":
                let order = strg.get("order");
                if(order.addresses.length){
                    Object.keys(order.addresses[0]).forEach(function (key){
                        let val = order.addresses[0][key];
                        if(typeof val === "boolean"){
                            val = +val;
                        }
                        $(form).find("[name=" + key + "]").val(val);
                    });
                }
                $(".modal-title").html('Shipping Information');
                break;
            case "/Auth/remote/signUp":
                $(".modal-title").html('Create an Account');
                break;
            case "/Auth/signIn":
                $(".modal-title").html('Account Login');
                break;
        }
    }
}

const makeObj = function (names,values){
    const obj = {};
    names.forEach((key, i) => obj[key] = values[i]);
    return obj;
}

setTimeout(function (){
    if(strg.get("orderConfig")){
        loginView();
    }
    if(strg.get("orderItems")){
        calcOrder();
    }
},500)

const getParameterValue = function (parameterName, url) {
    url = url || window.location.href;
    const parameters = url.slice(url.indexOf('?') + 1).split('&');
    for (let i = 0; i < parameters.length; i++) {
        const pair = parameters[i].split('=');
        const name = decodeURIComponent(pair[0]);
        const val  = decodeURIComponent(pair[1]);
        if (name === parameterName) {
            return val;
        }
    }
    return null;
}

setTimeout(function (){
    const paramTriggers = ["click","focus","promo","view","pop"];
    paramTriggers.forEach(function(trigger){
        const clickId = getParameterValue(trigger);
        if(clickId){
            if($("#" + clickId).length){
                setTimeout(function (){
                    $("#" + clickId).trigger("click");
                },300);
                removeParameter(trigger);
            }
        }
    })
},500);

function removeParameter(parameterName) {
    const url = window.location.href;
    const [baseUrl, queryString] = url.split('?');

    if (!queryString) {
        return url;
    }

    const params = new URLSearchParams(queryString);
    params.delete(parameterName);

    const updatedQueryString = params.toString();
    const updatedUrl = updatedQueryString ? `${baseUrl}?${updatedQueryString}` : baseUrl;

    // Update the URL in the address bar without reloading the page
    history.replaceState(null, '', updatedUrl);
    //history.pushState(obj, obj.Title, obj.Url);
    return updatedUrl;
}