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


        this.init(container);

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

        init: function (container) {

            // scene

            this.scene = new THREE.Scene();
            //this.scene.fog = new THREE.Fog(0xeeeeee, 1000, 3000);

            var w = container.clientWidth,
                h = container.clientHeight;

            // camera

            // this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 500);
            // this.camera.position.set(0, 0, 100);
            // this.camera.name = "p";

            this.camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -200, 50);
            this.camera.name = "o";

            this.cameraAnchor = new THREE.Object3D();
            this.cameraAnchor.add(this.camera);

            this.scene.add(this.cameraAnchor);


            this.picker = new GP.Picker(w, h, this.camera);

            // lights

            this.lights = [];

            {
                var l;

                l = new THREE.AmbientLight(0xBBBBBB);
                this.lights.push(l);
                this.scene.add(l);

                l = new THREE.HemisphereLight(0x777777, 0, 0.1);
                l.position.set(0, 0, 500);
                this.lights.push(l);
                this.scene.add(l);

                l = new THREE.PointLight(0xEEEEEE, 0.8, this.wallSize.x * 3);
                l.position.set(this.wallSize.x, this.wallSize.y, 0);
                this.lights.push(l);
                this.scene.add(l);

            }


            // Wall
            {
                var Wall = function (size) {

                    this.size = size;

                };

                Wall.prototype = {

                    size: null,

                    canvas: null,
                    context: null,
                    mesh: null,

                    reset: function (w, h, scene) {

                        this.size.x = w;
                        this.size.y = h;

                        if (this.canvas === null) {
                            this.canvas = document.createElement('canvas');

                            this.context = this.canvas.getContext('2d');
                        }

                        this.canvas.width = this.size.x = w;
                        this.canvas.height = this.size.y = h;


                        if (scene) {

                            if (this.mesh) {

                                scene.remove(this.mesh);
                                this.mesh = null;
                            }

                            var g = new THREE.PlaneGeometry(w, h);

                            var m = new THREE.MeshBasicMaterial({
                                map: new THREE.Texture(this.canvas),
                                transparent: true
                            });

                            this.mesh = new THREE.Mesh(g, m);

                            scene.add(this.mesh);
                        }

                    },

                    update: function (time, balls, booms) {

                        if (this.mesh === null) {
                            console.warn("[GP.Wall] this.mesh==null: reset() must be run before update");
                            return;
                        }

                        var ctx = this.context;

                        ctx.clearRect(0, 0, this.size.x, this.size.y);

                        // ctx.globalAlpha = 0.75;
                        // ctx.strokeStyle = "red";
                        // ctx.strokeRect(0, 0, this.size.x, this.size.y);

                        // draw Ball's glow
                        {
                            ctx.globalAlpha = 0.2;
                            ctx.shadowBlur = 5;

                            for (var i = 0, b; i < balls.length; i++) {
                                b = balls[i];

                                ctx.beginPath();
                                ctx.shadowColor = ctx.fillStyle = '#' + (b.material.ambient || b.material.color).getHexString();
                                ctx.arc(b.position.x + this.size.x / 2, -b.position.y + this.size.y / 2, b.geometry.radius * 1.025, 0, 2 * Math.PI);

                                ctx.fill();
                            }

                        }


                        // draw Boom's orbs
                        {
                            ctx.shadowBlur = 50;

                            for (var i = 0, b; i < booms.length; i++) {

                                b = booms[i];
                                b.update(time);

                                if (!b.isDead) {

                                    ctx.globalAlpha = b.opacity;
                                    ctx.shadowColor = ctx.fillStyle = b.color;
                                    ctx.beginPath();
                                    ctx.arc(b.ball.position.x + this.size.x / 2, -b.ball.position.y + this.size.y / 2, b.radius, 0, 2 * Math.PI);
                                    ctx.fill();
                                }
                            }

                        }

                        this.mesh.material.map.needsUpdate = true;
                    }

                };

                this.wall = new Wall(this.wallSize);
            }

            // balls

            this.balls = [];

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

                var generateNewPosition = function (balls, radius) {

                    var pos = new THREE.Vector3(),
                        tries = 5;

                    // avoid too many overlapping balls
                    var validatePosition = function (balls, radius, pos) {

                        var other,
                            d,
                            a, b;

                        for (var i = 0; i < balls.length; i++) {
                            other = balls[i];
                            if (other != undefined) {
                                a = Math.pow(other.position.x - pos.x, 2);
                                b = Math.pow(other.position.y - pos.y, 2);
                                d = Math.sqrt(a + b);

                                if (d < (other.radius + radius) * 0.75) return false;
                            }
                        }

                        //                     console.log(~~d, other ? ~~other.radius : null, ~~radius);

                        return true;

                    };

                    do {
                        pos = new THREE.Vector3(
                            r(posMax.x) - posMax.x / 2,
                            r(posMax.y) - posMax.y / 2,
                            r(50)
                        );
                    }
                    while (!validatePosition(balls, radius, pos) && tries-- > 0)

                    return tries > 0 ? pos : null;

                };

                for (var i = 0; i < 30; i++) {

                    radius = r(radiusMax - radiusMin) + radiusMin;
                    pos = generateNewPosition(this.balls, radius);

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
                        ball.position.set(pos.x, pos.y, pos.z);

                        ball.name = "ball" + i + "#" + m.color.getHexString() + "@" + JSON.stringify(ball.position);

                        this.balls.push(ball);
                        this.scene.add(ball);

                        // console.log("new: ball(%i, %i, %i) @%i:%i:%i", radius, segW, segH, pos.x, pos.y, pos.z);
                    }
                }

                console.log(this.balls.length + " balls created.");

                this.initEvents();

            };

            this.initBalls();


            // renderer

            this.renderer = (function initRenderer(scene) {

                var renderer = new THREE.WebGLRenderer({
                    alpha: true
                });

                // renderer.setClearColor(scene.fog.color, 1);

                renderer.setSize(container.clientWidth, container.clientHeight);

                return renderer;

            })(this.scene);


            container.appendChild(this.canvas = this.renderer.domElement);

            this.onCanvasResize(this.canvas.clientWidth, this.canvas.clientHeight);

        },

        render: function () {

            var time = Date.now(),
                w = this.canvas.clientWidth,
                h = this.canvas.clientHeight;

            if (this.canvas.width != w || this.canvas.height != h) {
                this.onCanvasResize(w, h);
            }

            this.renderer.render(this.scene, this.camera);

            this.animate(time);

        },

        animate: function (time) {

            if (this.booms.length > 0) {

                this.updateBooms(time);

            }

            this.wall.update(time, this.balls, this.booms);

        },


        boom: function (ball) {

            //             console.log("Boom ", ball.name);

            this.booms.push(new GP.Boom(ball));

        },

        updateBooms: function (time) {

            for (var i = 0, b; i < this.booms.length; i++) {

                b = this.booms[i];

                if (b.isDead) {

                    this.booms.splice(i, 1);
                    i--;

                } else {

                    b.update(time);

                }
            }

        },

        onCanvasResize: function (w, h) {

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

            this.wall.reset(w, h, this.scene);

            this.picker.reset(w, h, this.camera);

        },

        initEvents: function () {

            // http://mwbrooks.github.io/thumbs.js/
            this.container.addEventListener('touchstart', this.onClick.bind(this), false);

        },

        onClick: function (e) {

            if (!this._boom) {
                this._boom = this.boom.bind(this);
            }

            this.picker.pickAt(e.clientX, e.clientY, this.balls, this._boom);

        }
    };



    GP.Picker = function (w, h, camera) {

        this.reset(w, h, camera);

    }

    GP.Picker.prototype = {
        constructor: GP.Picker,

        camera: null,

        width: null,
        height: null,
        widthHalf: null,
        heightHalf: null,

        projector: null,
        vector: null,

        reset: function (w, h, camera) {

            this.width = w;
            this.height = h;

            this.projector = new THREE.Projector();
            this.vector = new THREE.Vector3();

            this.camera = camera;

        },

        pickAt: function (x, y, targets, callback) {

            this.vector.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1, 0);

            var ray;

            if (this.camera.name == "o") {

                ray = this.projector.pickingRay(this.vector, this.camera);

            } else {

                this.projector.unprojectVector(this.vector, this.camera);

                ray = new THREE.Raycaster(this.camera.position, this.vector.sub(this.camera.position).normalize());

            }

            var intersects = ray.intersectObjects(targets);

            if (intersects.length > 0) {

                // console.log(intersects[0].object.name);

                callback(intersects[0].object);

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

function render() {

    uni.render();

    requestAnimationFrame(render);
};

render();