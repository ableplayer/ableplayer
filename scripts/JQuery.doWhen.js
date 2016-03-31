/*! Copyright (c) 2014 - Paul Tavares - purtuga - @paul_tavares - MIT License */
;(function($){

    /**
     * Delays the execution of a function until an expression returns true.
     * The expression is checked every 100 milliseconds for as many tries
     * as defined in in the attempts option
     *
     * @param {Object} options
     * @param {Function} options.when
     *                      Function to execute on every interval.
     *                      Must return true (boolean) in order for
     *                      options.do to be executed.
     * @param {Function} [options.exec]
     *                      Function to be executed once options.when()
     *                      returns true.
     * @param {Interger} [options.interval=100]
     *                      How long to wait in-between tries.
     * @param {Interger} [options.attempts=100]
     *                      How many tries to use before its considered
     *                      a failure.
     * @param {Interger} [options.delayed=0]
     *                      Number of miliseconds to wait before execution
                            is started. Default is imediately.
     *
     * @return {jQuery.Promise}
     *
     * @example
     *
     *      $.doWhen({
     *          when: function(){
     *              return false;
     *          },
     *          exec: function(){
     *              alert("never called given false response on when param!");
     *          }
     *      })
     *      .fail(function(){
     *          alert('ALERT: FAILED CONDITION');
     *      })
     *      .then(function(){
     *          alert("resolved.");
     *      });
     *
     */
    $.doWhen = function(options) {

        return $.Deferred(function(dfd){

            var opt = $.extend({}, {
                    when:       null,
                    exec:       function(){},
                    interval:   100,
                    attempts:   100,
                    delayed:    0
                },
                options,
                {
                    checkId: null
                }),
                startChecking = function(){

                    // Check condition now and if true, then resolve object
                    if (opt.when() === true) {

                        opt.exec.call(dfd.promise());
                        dfd.resolve();
                        return;

                    }

                    // apply minimal UI and hide the overlay
                    opt.checkId = setInterval(function(){

                            if (opt.attempts === 0) {

                                clearInterval(opt.checkId);
                                dfd.reject();

                            } else {

                                --opt.attempts;

                                if (opt.when() === true) {

                                    opt.attempts = 0;
                                    clearInterval(opt.checkId);
                                    opt.exec.call(dfd.promise());
                                    dfd.resolve();

                                }

                            }

                        }, opt.interval);

                };

            if (opt.delayed > 0) {

                setTimeout(startChecking, Number(opt.delayed));

            } else {

                startChecking();

            }

        }).promise();

    };

})(jQuery);