var GP = GP || {};


(function () {

    'use strict';


    if (!Detector.webgl) Detector.addGetWebGLMessage();

    GP.Universe = function (container, config) {

        config = config || {};
        this.config.antialias = config.antialias || false;

        this.container = container;

        this.wallSize = new THREE.Vector2(container.clientWidth, container.clientHeight);

        this.booms = [];

        var init = function (container) {

            var scene, camera, cameraAnchor, renderer;

            var lights, balls;

            // scene

            scene = new THREE.Scene();
            //scene.fog = new THREE.Fog(0xeeeeee, 1000, 3000);


            // camera

            // camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 500);
            // camera.position.set(0, 0, 100);
            // camera.name = "p";

            camera = new THREE.OrthographicCamera(-container.clientWidth / 2, container.clientWidth / 2, container.clientHeight / 2, -container.clientHeight / 2, -200, 0);
            camera.name = "o";

            cameraAnchor = new THREE.Object3D();
            cameraAnchor.add(camera);

            scene.add(cameraAnchor);


            // lights

            lights = [];

            {
                var l;

                l = new THREE.AmbientLight(0xBBBBBB);
                lights.push(l);
                scene.add(l);

                l = new THREE.HemisphereLight(0x777777, 0, 0.1);
                l.position.set(0, 0, 500);
                lights.push(l);
                scene.add(l);

                l = new THREE.PointLight(0xEEEEEE, 0.8, this.wallSize.x * 3);
                l.position.set(this.wallSize.x, this.wallSize.y, 0);
                lights.push(l);
                scene.add(l);

            }


            // Wall
            {
                var Wall = function (uni) {

                    this.uni = uni;
                };

                Wall.prototype = {

                    uni: null,

                    canvas: null,
                    context: null,
                    mesh: null,

                    reset: function () {

                        var w = this.uni.wallSize.x,
                            h = this.uni.wallSize.y;

                        if (this.canvas === null) {
                            this.canvas = document.createElement('canvas');

                            this.context = this.canvas.getContext('2d');
                        }

                        this.canvas.width = this.uni.wallSize.x = w;
                        this.canvas.height = this.uni.wallSize.y = h;


                        if (this.uni.scene) {

                            if (this.mesh) {

                                this.uni.scene.remove(this.mesh);
                                this.mesh = null;
                            }

                            var g = new THREE.PlaneGeometry(w, h);

                            var m = new THREE.MeshBasicMaterial({
                                map: new THREE.Texture(this.canvas),
                                transparent: true
                            });

                            this.mesh = new THREE.Mesh(g, m);

                            this.uni.scene.add(this.mesh);
                        }

                    },

                    update: function (time) {

                        var ctx = this.context;

                        ctx.clearRect(0, 0, this.uni.wallSize.x, this.uni.wallSize.y);

                        // ctx.globalAlpha = 0.75;
                        // ctx.strokeStyle = "red";
                        // ctx.strokeRect(0, 0, this.uni.wallSize.x, this.uni.wallSize.y);

                        // draw Ball's shadow/antialias
                        {
                            ctx.globalAlpha = 1;
                            ctx.shadowBlur = 2;

                            for (var i = 0, b; i < this.uni.balls.length; i++) {
                                b = this.uni.balls[i];

                                ctx.beginPath();
                                ctx.shadowColor = ctx.fillStyle = '#' + (b.material.ambient || b.material.color).getHexString();
                                ctx.arc(b.position.x + this.uni.wallSize.x / 2, -b.position.y + this.uni.wallSize.y / 2, b.geometry.radius, 0, 2 * Math.PI);

                                ctx.fill();
                            }

                        }


                        // draw Boom's orbs
                        {
                            ctx.shadowBlur = 50;

                            for (var i = 0, b; i < this.uni.booms.length; i++) {

                                b = this.uni.booms[i];
                                b.update(time);

                                if (!b.isDead) {

                                    ctx.globalAlpha = b.opacity;
                                    ctx.shadowColor = ctx.fillStyle = b.color;
                                    ctx.beginPath();
                                    ctx.arc(b.ball.position.x + this.uni.wallSize.x / 2, -b.ball.position.y + this.uni.wallSize.y / 2, b.radius, 0, 2 * Math.PI);
                                    ctx.fill();
                                }
                            }

                        }

                        if (this.mesh === null) this.reset();

                        this.mesh.material.map.needsUpdate = true;
                    }

                };

                this.wall = new Wall(this);
            }

            // balls

            balls = [];

            window.setTimeout(this.initBalls.bind(this), 1);

            // renderer

            renderer = (function initRenderer(scene) {

                var renderer = new THREE.WebGLRenderer({
                    antialias: config.antialias,
                    alpha: true
                });

                // renderer.setClearColor(scene.fog.color, 1);

                renderer.setSize(container.clientWidth, container.clientHeight);

                return renderer;

            })(scene);



            this.scene = scene;
            this.camera = camera;
            this.cameraAnchor = cameraAnchor;
            this.lights = lights;
            this.balls = balls;
            this.renderer = renderer;

            container.appendChild(this.canvas = renderer.domElement);

            this.onCanvasResize(this.canvas.clientWidth, this.canvas.clientHeight);

        };


        this.initBalls = function () {

            var wallSizeHalf = new THREE.Vector2(this.wallSize.x / 2, this.wallSize.y / 2),
                radiusMin = Math.min(this.wallSize.x, this.wallSize.y) * 0.05,
                radiusMax = Math.min(this.wallSize.x, this.wallSize.y) * 0.20,
                posMax = wallSizeHalf,
                segW = 30,
                segH = ~~ (segW * 0.7);

            var r = function (max) {
                    return (~~(Math.random() * max));
                },
                c = [0xDA4453, 0xE9573F, 0xFCBB42, 0x8CC152, 0x37BC9B, 0x3BAFDA, 0x4A89DC, 0x967ADC, 0xD770AD, 0xE6E9ED, 0xAAB2BD, 0x434A54], // colors
                c2 = [0xED5565, 0xFC6E51, 0xFFCE54, 0xA0D468, 0x48CFAD, 0x4FC1E9, 0x5D9CEC, 0xAC92EC, 0xEC87C0, 0xF5F7FA, 0xCCD1D9, 0x656D78], // colors
                cl = c.length - 1,
                cli = 0, // color cursor
                g, // temp geometry
                m, // temp material
                ball, // temp mesh
                radius, // temp radius
                pos; // temp pos

            var newPos = function (radius) {

                var pos = new THREE.Vector2(),
                    tries = 5;

                // avoid too many overlapping balls
                var validatePosition = function (radius, pos) {

                    var other,
                        d,
                        a, b;

                    for (var i = 0; i < this.balls.length; i++) {
                        other = this.balls[i];
                        if (other != undefined) {
                            a = Math.pow(other.position.x - pos.x, 2);
                            b = Math.pow(other.position.y - pos.y, 2);
                            d = Math.sqrt(a + b);

                            if (d < (other.radius + radius) * 0.75) return false;
                        }
                    }

                    //                     console.log(~~d, other ? ~~other.radius : null, ~~radius);

                    return true;

                }.bind(this);

                do {
                    pos = new THREE.Vector2(
                        r(posMax.x) - posMax.x / 2,
                        r(posMax.y) - posMax.y / 2
                    );
                }
                while (!validatePosition(radius, pos) && tries-- > 0)

                return tries > 0 ? pos : null;

            }.bind(this);

            for (var i = 0; i < 30; i++) {

                radius = r(radiusMax - radiusMin) + radiusMin;
                pos = newPos(radius);

                if (pos !== null) {

                    g = new THREE.SphereGeometry(radius, segW, segH, 0, Math.PI);
                    g.radius = radius;

                    var cIndex = ++cli % (cl + 1);

                    m = new THREE.MeshPhongMaterial({
                        ambient: new THREE.Color(c2[cIndex]),
                        color: new THREE.Color(c[cIndex]),
                        // shading: THREE.FlatShading,
                        // specular: 0xbbbbbb,
                        shininess: 60,
                        metal: true
                    });

                    ball = new THREE.Mesh(g, m);
                    ball.radius = radius;
                    // ball.rotateX(0.5 * Math.PI);
                    ball.position.set(pos.x, pos.y, 0);

                    ball.name = "ball" + i + "#" + m.color.getHexString() + "@" + JSON.stringify(ball.position);

                    this.balls.push(ball);
                    this.scene.add(ball);

                    //                         console.log("new: ball(%i, %i, %i) @%i:%i", radius, segW, segH, pos.x, pos.y);
                }
            }

            console.log(this.balls.length + " balls created.");

            this.initEvents();

        };

        this.picker = new GP.Picker(this);

        this.initEvents = function () {

            // http://mwbrooks.github.io/thumbs.js/
            this.container.addEventListener('touchstart', this.onClick.bind(this), false);

        };

        this.onClick = function (e) {

            this.picker.pickAt(e.clientX, e.clientY);

        };

        this.onCanvasResize = function (w, h) {

            this.canvas.width = this.wallSize.x = w;
            this.canvas.height = this.wallSize.y = h;

            if (this.camera.name == "o") {

                this.camera.left = -container.clientWidth / 2;
                this.camera.right = container.clientWidth / 2;
                this.camera.top = container.clientHeight / 2;
                this.camera.bottom = -container.clientHeight / 2;

            } else {

                this.camera.aspect = w / h;

            }

            this.camera.updateProjectionMatrix();

            this.renderer.setSize(w, h);

            this.wall.reset();

            this.picker.reset();

        }.bind(this);


        this.boom = function (ball) {

            console.log("Boom ", ball.name);

            this.booms.push(new GP.Boom(ball));

        };

        this.updateBooms = function (time) {

            for (var i = 0, b; i < this.booms.length; i++) {

                b = this.booms[i];

                if (b.isDead) {

                    this.booms.splice(i, 1);
                    i--;

                } else {

                    b.update(time);

                }
            }

        };


        this.animate = function (time, delta) {

            if (this.booms.length > 0) {

                this.updateBooms(time);

            }
            this.wall.update(time);

        };


        var lastTime = 0;

        this.render = (function () {

            var time = Date.now(),
                w = this.canvas.clientWidth,
                h = this.canvas.clientHeight;

            if (this.canvas.width != w || this.canvas.height != h) {
                this.onCanvasResize(w, h);
            }

            this.renderer.render(this.scene, this.camera);

            this.animate(time, time - lastTime);

            lastTime = time;

            requestAnimationFrame(this.render);

        }).bind(this);


        init.call(this, container);

        return this;
    };

    GP.Universe.prototype = {
        constructor: GP.Universe,

        config: {},

        container: null,
        canvas: null,

        camera: null,
        cameraAnchor: null,

        scene: null,
        renderer: null,

        floor: null,
        lights: null,
        wall: null,
        booms: null,

        render: null
    };




    GP.Picker = function (uni) {

        this.uni = uni;
        this.reset();

    }

    GP.Picker.prototype = {
        constructor: GP.Picker,

        uni: null,
        targets: null,

        width: null,
        height: null,
        widthHalf: null,
        heightHalf: null,

        projector: null,
        vector: null,

        reset: function () {

            this.width = this.uni.container.clientWidth;
            this.height = this.uni.container.clientHeight;
            this.widthHalf = this.uni.container.clientWidth / 2;
            this.heightHalf = this.uni.container.clientHeight / 2;

            this.projector = new THREE.Projector();
            this.vector = new THREE.Vector3();

            this.targets = this.uni.balls;

        },

        pickAt: function (x, y) {

            this.vector.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1, 0);

            var ray;

            if (this.uni.camera.name == "o") {

                ray = this.projector.pickingRay(this.vector, this.uni.camera);

            } else {

                this.projector.unprojectVector(this.vector, this.uni.camera);

                ray = new THREE.Raycaster(this.uni.camera.position, this.vector.sub(this.uni.camera.position).normalize());

            }

            var intersects = ray.intersectObjects(this.targets);

            if (intersects.length > 0) {

                this.uni.boom(intersects[0].object);

            }
        },
    };




    GP.Boom = function (ball) {

        if (!ball) throw new Error("A Boom needs a ball!");

        this.ball = ball;
        this.startTime = Date.now();
        this.lengthTime = 1000 * 2;
        this.endTime = this.startTime + this.lengthTime;

        this.radius = ball.geometry.radius;
        this.radiusEnd = ball.geometry.radius * (Math.exp(3) / 2);

        this.color = '#' + (ball.material.ambient || ball.material.color).getHexString();
        this.opacity = 1;
    };

    GP.Boom.prototype = {
        constructor: GP.Boom,

        ball: null, // mesh object source
        startTime: null, // date source
        lengthTime: null,
        endTime: null, // date death

        radius: null, // current radius of the orb
        radiusEnd: null,

        color: null,
        opacity: null,

        isDead: false,

        update: function update(time) {

            var x = 3 - (time - this.startTime) / (this.lengthTime) * 3;
            if (x < 0) x = 0;

            var animFactor = (Math.exp(x) / 2) - 0.5;

            this.radius = this.radiusEnd - this.ball.geometry.radius * animFactor;

            this.opacity = 0.5 * (animFactor / 9.5);

            if (Date.now() > this.endTime) {
                this.isDead = true;
            }
        }
    };


})();

var uni = new GP.Universe(document.getElementById('container'));
uni.render();