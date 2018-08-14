// abstract base class for machines
function Machine(x, y, autoOn){
    Entity.call(this);
    this.startX = x * BLOCK_SIZE;
    this.startY = y * BLOCK_SIZE;
    this.autoOn = autoOn;
    this.emitting = false;
}
Machine.prototype = {
    init : function(){
        this.setCoords(this.startX, this.startY);
        this.powered = false;
    },
    isEnabled : function(){
        return this.powered || this.autoOn;
    },
    setEmitting : function(boolean){
        this.emitting = boolean;
    },
    getEmitting : function(){
        return this.emitting;
    },
    draw : function(canvas){
        var obj = this;
        throw new Error("No draw method found for " + obj);
    },
    collide : function(entity){
        //each subclass defines
    },
    checkColl : function(entity){
        if(this.checkForCollide(entity)){
            this.collide(entity);
        }
    },
    update : function(){
        //defined by subclasses
    },
    checkIfUpdate : function(){
        if(this.isEnabled()){
            this.update();
        }
    }
};
extend(Machine, Entity);

function Gear(x, y, jump){
    Machine.call(this, x, y, true);
    this.jump = jump;
    this.claimed = false;
    this.rotated = false;
    this.rotateCount = 0;
}

Gear.prototype = {
    draw : function(canvas){
        if(!this.claimed){
            canvas.drawGear(this.x, this.y, BLOCK_SIZE * 0.9, this.jump.color, this.rotated);
        }
    },
    collide : function(entity){
        try{
            if(!this.claimed){
                entity.obtainGear(this.jump);
                this.claimed = true;
            }
        } catch(e){
            //not a Player
            console.log(e.stack);
        }
    },
    update : function(){
        if(!this.claimed){
            if(this.rotateCount === this.getHost().fps){
                this.rotated = !this.rotated;
                this.rotateCount = 0;
            }
            this.rotateCount++;
        }
    }
};
extend(Gear, Machine);



function Belt(x, y, width, movesRight, autoOn){
    Machine.call(this, x, y, autoOn);
    this.setWidth(width * BLOCK_SIZE);
    this.movesRight = movesRight;
}
Belt.prototype = {
    draw : function(canvas){
        canvas.setColor("rgb(0, 0, 0)");
        canvas.rect(this.x + BLOCK_SIZE / 2, this.y, this.width - BLOCK_SIZE, this.height);
        
        canvas.setColor(silver(7));
        canvas.circle(this.x, this.y, BLOCK_SIZE);
        canvas.circle(this.x + this.width - BLOCK_SIZE, this.y, BLOCK_SIZE);
    },
    collide : function(entity){
        var speed = blocksPerSecond(1);
        entity.setY(this.y - entity.height);
        entity.falling = false;
        entity.moveX((this.movesRight) ? speed : -speed);
    },
    update : function(){
        //do nothing
    }
};
extend(Belt, Machine);



function Tram(x, y, destinations, autoOn){
    Machine.call(this, x, y, autoOn);
    this.destinations = [[this.startX, this.startY]];
    var t = this;
    destinations.forEach(function(coords){t.destinations.push([coords[0] * BLOCK_SIZE, coords[1] * BLOCK_SIZE])});
    this.destNum = 0; //the index of the next destination to go to
    this.ready = true; //has completed carrying an entity and has returned to its start point
    this.moving = false;
    this.carrying = null; //the entity this is carrying
}
Tram.prototype = {
    draw : function(canvas){
        canvas.setColor(silver(7));
        canvas.rect(this.x + BLOCK_SIZE / 4, this.y, BLOCK_SIZE / 2, BLOCK_SIZE);
        canvas.rect(this.x, this.y + BLOCK_SIZE * 0.75, BLOCK_SIZE, BLOCK_SIZE / 4);
        
        if (this.isEnabled()){
            canvas.setColor("rgb(155, 255, 0)");
            canvas.rect(this.x, this.y + BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE / 20);
        }
    },
    collide : function(entity){
        if(this.ready && this.isEnabled() && this.carrying === null){
            this.carrying = entity;
            this.moving = true;
            this.ready = false;
        }
    },
    checkForCollide : function(entity){
        var ret = false;
        if(!this.moving){
            ret = Machine.prototype.checkForCollide.call(this, entity);
        }
        
        if(!this.moving && this.isEnabled() && entity.x >= this.x && entity.x <= this.x + BLOCK_SIZE && entity.y >= this.y + BLOCK_SIZE){
            entity.moveY(-blocksPerSecond(2));
            entity.falling = false;
        }
        return ret;
    },
    followPath : function(){
        current = this.destinations[this.destNum];
        var speed = blocksPerSecond(1);
        if (this.x > current[0]){
            this.x -= speed;
        } else if (this.x < current[0]){
            this.x += speed;
        }
    
        if (this.y > current[1]){
            this.y -= speed;
        } else if (this.y < current[1]){
            this.y += speed;
        }
    
        //check if we are as close as possible
        if (between(current[0], this.x, current[0] + speed) && between(current[1], this.y, current[1] + speed)){
            if(this.destNum === 0 && !this.ready && !this.carrying){
                this.ready = true;
                this.moving = false;
            } else {
                this.destNum++;
            }
            if (this.destNum === this.destinations.length){
                //completed path
                this.destNum = 0;
                this.carrying = null;
            }
        }
    },
    update : function(){
        if(this.moving){
            this.followPath();
            if(this.carrying !== null){
                this.carrying.setCoords(this.x, this.y + this.height);
                this.carrying.falling = false;
            }
            this.powered = true; //otherwise, will stop immediately upon moving
        }
    }
};
extend(Tram, Machine);



function Generator(x, y){
    Machine.call(this, x, y, true);
    this.setHeight(BLOCK_SIZE * 2);
    this.setEmitting(true);
}
Generator.prototype = {
    draw:function(canvas) {
        canvas.setColor(silver(7));
        canvas.rect(this.x + BLOCK_SIZE * 0.1, this.y - BLOCK_SIZE, BLOCK_SIZE * 0.8, BLOCK_SIZE * 2);
        
        canvas.setColor(silver(4));
        canvas.rect(this.x, this.y - BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE / 2);
        canvas.rect(this.x, this.y + BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE / 2);
        
        canvas.setColor("rgb(155, 255, 0)");
        canvas.rect(this.x + BLOCK_SIZE * 0.4, this.y - BLOCK_SIZE / 2, BLOCK_SIZE / 5, BLOCK_SIZE);
    },
    
    update:function() {
        //do nothing
    }
};
extend(Generator, Machine);



function Door(x, y){
    Machine.call(this, x, y, false);
}
Door.prototype = {
    collide : function(entity) {
        if(!this.isEnabled()){
            if(entity.x + entity.width / 2 > this.x + this.width / 2){
                //over halfway through
                entity.setX(this.x + this.width);
            } else {
                entity.setX(this.x - entity.width);
            }
        }
    },
    
    draw:function(canvas) {
        if (!this.isEnabled()){
            canvas.setColor(silver(6));
            canvas.rect(this.x + BLOCK_SIZE / 10, this.y, BLOCK_SIZE * 0.8, BLOCK_SIZE);
        
            canvas.setColor("rgb(0, 0), 0)");
            canvas.rect(this.x + BLOCK_SIZE / 10, this.y + BLOCK_SIZE / 2, BLOCK_SIZE * 0.8, 1);
        }

        canvas.setColor(silver(2));
        canvas.rect(this.x, this.y, BLOCK_SIZE, BLOCK_SIZE / 10);
        canvas.rect(this.x, this.y + BLOCK_SIZE * 0.9, BLOCK_SIZE, BLOCK_SIZE / 10);
    },
    
    update:function() {
        // do nothing
    } 
};
extend(Door, Machine);



function PickupGear(x, y){
    Machine.call(this, x, y, true);
    this.claimed = false;
    this.rotated = false;
    this.rotateCount = 0;
}
PickupGear.prototype = {
    draw : function(canvas){
        if(!this.claimed){
            canvas.drawGear(this.x, this.y, BLOCK_SIZE * 0.9, gold(7), this.rotated);
        }
    },
    collide : function(entity){
        try{
            if(!this.claimed){
                entity.pickup("gear");
                this.claimed = true;
            }
        } catch(e){
            //not a Player
            console.log(e.stack);
        }
    },
    update : function(){
        if(!this.claimed){
            if(this.rotateCount === this.getHost().fps){
                this.rotated = !this.rotated;
                this.rotateCount = 0;
            }
            this.rotateCount++;
        }
    }
};
extend(PickupGear, Machine);



// a gear train
function Train(x, y, autoOn, gearsNeeded){
    Machine.call(this, x, y, autoOn);
    this.setWidth(BLOCK_SIZE * gearsNeeded);
    this.maxGears = gearsNeeded;
    this.gearCount = 0;
    this.rotateCount = 0;
    this.firstRotated = true;
}
Train.prototype = {
    draw:function(canvas){
        canvas.setColor(silver(4));
        canvas.rect(this.x, this.y, this.width, BLOCK_SIZE);
        
        for(var i = 0; i < this.gearCount; i++){
            canvas.drawGear(this.x + BLOCK_SIZE * i, this.y, BLOCK_SIZE, silver(2), (i % 2 === 0) ? this.firstRotated : !this.firstRotated);
        }
    },
    collide : function(entity){
        try{
            if(entity.getHasPickup("gear") && this.gearCount < this.maxGears){
                this.gearCount++;
                entity.loseItem("gear");
            }
        } catch(e){
            //not a player
            console.log(e.stack);
        }
    },
    update:function(){
        if(this.gearCount === this.maxGears){
            this.setEmitting(true);
            this.rotateCount++;
            if(this.rotateCount === this.getHost().fps){
                this.rotateCount = 0;
                this.firstRotated = !this.firstRotated;
            }
        }
    }
};
extend(Train, Machine);



function Lift(x, y, autoOn, distUp){
    //distUp is the amount of blocks it will move up
    Machine.call(this, x, y, autoOn);
    this.setHeight(BLOCK_SIZE / 10);
    this.maxAscent = this.startY - distUp * BLOCK_SIZE;
    this.goingUp = true;
    this.moving = false;
    this.waiting = false; //waiting to go back down
    this.waitTime = 0;
}
Lift.prototype = {
    draw : function(canvas){
        canvas.setColor(silver(3));
        canvas.rect(this.x, this.y - BLOCK_SIZE / 10, this.width, this.height);
    },
    collide : function(entity){
        entity.setY(this.y - entity.height);
        this.moving = true;
    },
    update : function(){
        if(this.moving){
            var speed = blocksPerSecond(2);
            if(this.goingUp){
                speed = -speed;
            }
            
            if(!this.waiting){
                this.moveY(speed);
            }
            
            if(this.waiting){
                if(this.waitTime === this.getHost().fps * 2){
                    this.waitTime = 0;
                    this.waiting = false;
                } else {
                    this.waitTime++;
                }
            }
            
            //remember, higher y means further down
            if(this.y <= this.maxAscent && this.goingUp){
                this.goingUp = false;
                this.waiting = true;
            } else if(this.y >= this.startY && !this.goingUp){
                this.goingUp = true;
                this.moving = false;
                this.waiting = true;
            }
        }
    }
};
extend(Lift, Machine);