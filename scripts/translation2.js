// end getTranslationText function, which began in translation1.js     

    this.tt = eval(this.lang);
    
    // resolve deferred variable
    gettingText.resolve();  
    return gettingText.promise(); 
  };
})(jQuery);
