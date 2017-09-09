import verb from 'verb-nurbs'
import {Matrix3} from  '../../../math/l3space'
import * as math from  '../../../math/math'
import {Point} from '../point'
import {Surface} from "../surface";
import Vector from "../../../math/vector";
import {Curve} from "../curve";

export class NurbsCurve extends Curve {

  constructor(verbCurve) {
    super();
    this.verb = verbCurve;
  }

  translate(vector) {
    const tr = new Matrix3().translate(vector.x, vector.y, vector.z).toArray();
    return new NurbsCurve(this.verb.transform(tr));
  }
  
  approximate(resolution, from, to, out) {
    const chunks = this.verb.divideByArcLength(10);
    let startU = this.verb.closestParam(from.toArray());
    let endU = this.verb.closestParam(to.toArray());
    const reverse = startU > endU;
    if (reverse) {
      const tmp = startU;
      startU = endU;
      endU = tmp;
      chunks.reverse();
    }

    for (let sample of chunks) {
      const u = sample.u;
      if (u > startU + math.TOLERANCE && u < endU - math.TOLERANCE) {
        out.push(new Point().set3(this.verb.point(u)));
      }
    }
  }

  approximateU(resolution, paramFrom, paramTo, consumer) {
    let u = paramFrom;
    let endU = paramTo;
    let step = this.verb.paramAtLength(resolution);
    if (u > endU) {
      step *= -1;
    }
    u += step;
    for (;step > 0 ? u < endU : u > endU; u += step) {
      consumer(u);
    }
  }
  
  tangentAtPoint(point) {
    return new Point().set3(this.verb.tangent(this.verb.closestParam(point.data())));
  }

  tangentAtParam(param) {
    return new Point().set3(this.verb.tangent(param ));
  }
  
  closestDistanceToPoint(point) {
    const closest = this.verb.closestPoint(point.data());
    return math.distance3(point.x, point.y, point.z, closest[0], closest[1], closest[2]);
  }

  split(point) {
    return this.verb.split(this.verb.closestParam(point.data)).map(v => new NurbsCurve(v));
  }

  intersect(other, tolerance) {
    return verb.geom.Intersect.curves(this.verb, other.verb, tolerance);
  }

  invert() {
    return new NurbsCurve(this.verb.reverse());
  }
  
  point(u) {
    return new Point().set3(this.verb.point(u));
  }
  
  static createByPoints(points, degeree) {
    points = points.map(p => p.data());
    return new NurbsCurve(new verb.geom.NurbsCurve.byPoints(points, degeree));
  }
}

NurbsCurve.createLinearNurbs = function(a, b) {
  return new NurbsCurve(new verb.geom.Line(a.data(), b.data()));
};

NurbsCurve.prototype.createLinearNurbs = function(a, b) {
  return NurbsCurve.createLinearNurbs(a, b);
};

export class NurbsSurface extends Surface {
  
  constructor(verbSurface) {
    super();
    this.verb = verbSurface;
    this.inverted = false;
  }

  toNurbs() {
    return this;
  }
  
  normal(point) {
    let uv = this.verb.closestParam(point.data());
    let normal = new Vector().set3(this.verb.normal(uv[0], uv[1]));
    if (this.inverted) {
      normal._negate();
    }
    return normal;
  }

  intersectForSameClass(other, tol) {
    const curves = verb.geom.Intersect.surfaces(this.verb, other.verb, tol);
    let inverted = this.inverted !== other.inverted;
    return curves.map(curve => new NurbsCurve(inverted ?  curve.reverse() : curve));
  }
  
  invert() {
    let inverted = new NurbsSurface(this.verb);
    inverted.inverted = !this.inverted;
    return inverted;
  }
}