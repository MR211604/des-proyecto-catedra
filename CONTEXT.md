# ERP for Confecciones Azucena

This context defines the language of the ERP that organizes customer service, garment alteration and sewing requests, production, materials, and workshop payments. The system supports workshop administration; it does not replace the craft work or constitute a formal accounting system.

## Actors And Commercial Records

**Workshop**:
The tailoring and sewing business that receives garments, measurements, and work requests, and coordinates their production and delivery.
_Avoid_: company, factory, branch

**Customer**:
The person who requests one or more jobs from the workshop and owns the associated contact details, measurements, and order history.
_Avoid_: user, buyer, account

**User**:
The person authorized to operate the ERP on behalf of the workshop. A user may have the owner or authorized staff role, but is not necessarily a customer.
_Avoid_: customer, employee

**Owner**:
The primary person responsible for the workshop and its administration. In the system, the owner can perform the same operational actions as authorized staff.
_Avoid_: system administrator, customer

**Quote**:
The pricing proposal for one or more jobs that the workshop presents to a customer before converting it into a confirmed order.
_Avoid_: estimate, order, invoice

**Order**:
The work commitment accepted by the workshop for a customer, containing one or more garment or service details, a price, and an estimated delivery date.
_Avoid_: job, work order, quote, sale

**Order Item**:
A line describing a specific part of an order: what will be done, in what quantity, and at what price. An order may contain multiple order items.
_Avoid_: product, article, service

**Service**:
A type of work offered by the workshop, such as an alteration, fitting, garment construction, or garment design.
_Avoid_: product, order

**Garment**:
The physical object that the workshop alters, fits, constructs, or uses as a reference for an order.
_Avoid_: product, article

**Customer History**:
The collection of orders associated with a customer, including current and previously completed work.
_Avoid_: user history, payment history

## Measurements And Production

**Customer Measurements**:
The set of body dimensions recorded to support garment construction or fitting. Measurements may be updated when the customer's circumstances or the work require it.
_Avoid_: physical profile, size

**Complexity**:
The classification of a job's relative effort as low, medium, or high, used to organize workshop workload and estimate duration.
_Avoid_: priority, difficulty, urgency

**Estimated Delivery Date**:
The day on which the workshop expects an order to be ready for customer pickup. It is a planning estimate, not the actual delivery date.
_Avoid_: promised date, due date, actual delivery date

**Production**:
The craft work required to complete accepted orders, from preparation until they are ready for delivery.
_Avoid_: manufacturing, order

**Production Job**:
An executable unit of work within an order, possibly associated with a specific order item, that occupies a stage and has its own status.
_Avoid_: order, task, service

**Production Stage**:
An ordered position in the workshop's production flow, such as cutting, sewing, or finishing. Stages form the route through which a production job progresses.
_Avoid_: status, department, priority

**Order Status**:
The order's overall situation in its lifecycle: confirmed, in production, ready, delivered, or cancelled.
_Avoid_: stage, payment status, progress

**Job Status**:
The operational situation of a production job: to do, in progress, blocked, or completed.
_Avoid_: order status, stage

**Production Event**:
A record of a production job changing stage, identifying where it came from, where it went, and who recorded the change.
_Avoid_: comment, status, task

**Delivery**:
The moment when the customer receives the completed garment. It is distinct from the work being ready and from having an estimated delivery date.
_Avoid_: completion, dispatch, pickup

## Materials And Inventory

**Material**:
A physical supply that the workshop stores or uses to perform its work, such as thread, fabric, buttons, zippers, elastic, or needles.
_Avoid_: product, article, resource

**Inventory**:
The collection of materials available to the workshop and the quantity held for each one.
_Avoid_: warehouse, stockroom, supplies

**On-hand Quantity**:
The available quantity of a material expressed in a defined unit of measure.
_Avoid_: stock, inventory

**Reorder Point**:
The minimum quantity of a material used as a reference for warning that it should be replenished.
_Avoid_: minimum stock, depletion limit

**Stock Movement**:
A record of a change in a material's on-hand quantity caused by a receipt, issue, sale, return, or adjustment.
_Avoid_: stock update, transaction

**Supplier**:
A person or business that may be associated with supplying a material. A supplier is not an operational ERP actor and is not required for every material.
_Avoid_: customer, vendor

**Unit Of Measure**:
The way the quantity of a material or job is expressed, such as meter, unit, roll, or kilogram.
_Avoid_: packaging, format

## Sales And Payments

**Sale**:
The commercial record associated with an order that holds the amount to be collected and its payment details.
_Avoid_: order, income, invoice

**Payment**:
An amount provided by the customer toward some or all of a sale, together with its method and reference when applicable.
_Avoid_: sale, deposit, income

**Partial Payment**:
A situation in which the sum of recorded payments is greater than zero and less than the sale total.
_Avoid_: deposit, debt, balance

**Outstanding Balance**:
The amount of a sale that has not yet been covered by recorded payments.
_Avoid_: debt, pending payment

**Sale Status**:
The collection situation of a sale: open, paid, or voided.
_Avoid_: order status, payment status

**Payment Method**:
The way a customer makes a payment, primarily cash or transfer.
_Avoid_: collection method, sale type

## Control And Inquiry

**Report**:
A summarized view of orders, payments, materials, or other workshop information used to understand its situation and support administrative decisions.
_Avoid_: balance sheet, accounting, invoice

**Audit**:
A record of who performed an action on workshop information and what changed, preserving traceability for relevant operations.
_Avoid_: customer history, production event

**Deactivation**:
The decision to stop showing a customer, supplier, or material as active without losing its historical reference.
_Avoid_: permanent deletion, cancellation

**Cancellation**:
The closing of an order before it completes its normal production and delivery lifecycle. It is not the same as deactivating a customer or voiding a sale.
_Avoid_: deletion, return, rejection
