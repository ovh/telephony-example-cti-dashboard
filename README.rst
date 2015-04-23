Description
===========

**Computer Telephony Integration:** Programatically manage phone calls.

This project shows signal events provided by the CTI from ``OVH France`` telephony services.

.. image:: https://github.com/ovh/telephony-example-cti-dashboard/raw/master/img/sample.jpg
           :alt: Telephony CTI Dashboard
           :target: https://www.ovhtelecom.fr/telephonie/services_inclus/cti.xml

Scope
=====

This dashboard works on SIP (sipCirpack) and hunting numbers (easyHunting and cloudHunting). It also works on some MGCP phones except for the following cases:
* MGCP to OVH SIP number or external numbers.

Features
========

This control panel can be used to display:
* call setup
* call duration
* call queuing events

from your ``OVH billing account``. It can be used as a starting point for a custom solution. It also allows the use of url callbacks to display user details or other needs.

How does it work ?
--------------------

This demo is a frontend-only application. The JavaScript processes long-polling requests against the following url:

.. code:: bash

    https://events.voip.ovh.net/?token=[TOKEN]

Getting started
=================

Get your `token group <https://api.ovh.com/console/#/telephony/{billingAccount}/eventToken#POST>`_ or `token number <https://api.ovh.com/console/#/telephony/{billingAccount}/service/{serviceName}/eventToken#POST>`_ from the API.

.. code:: text

    POST /telephony/{billingAccount}/eventToken

This will give you a token of the form ``ABCDEFAB-CDEF-ABCD-EFAB-CDEFABCDEFAB``. You can
now use it to fetch events with a ``curl`` request like:

.. code:: bash

    curl https://events.voip.ovh.net/?token=ABCDEFAB-CDEF-ABCD-EFAB-CDEFABCDEFAB


Deployment
----------

A live demo of this dashboard is available `<https://events.voip.ovh.net/demo/cti> here`

If you want to host it by yourself:

* Using ``Python``: `python -m SimpleHTTPServer`
* Using ``Apache``: copy all files of the project in your favorite web
server document root. Usually : `/var/www`.

Supported Events
================

CTI events are triggered by the followings:

Line (sip/mgcp)
---------------

- **start_ringing** Start ringing
- **end_ringing** End ringing
- **start_calling** Start calling
- **end_calling** End calling
- **registered** In case of register announcement

Hunting (easy/cloud)
--------------------

- **member-queue-start** Member entering a queue
- **member-queue-end** Member leaving a queue
- **agent-offering** Member ringing
- **bridge-agent-start** Agent start bridging
- **bridge-agent-end** Agent end bridging
- **bridge-agent-end** Agent end bridging
- **member-count** Member queue size changing

json::

>Data: {
>    Billing: "0033912312312" (OVH number)
>    Body: "SIP/2.0 200 OK" (Header SIP packet)
>    CallId: "N2ZkZmEyNGMxZWM0N2VhN2M4NGJkMTY4ZGYwZmU2OTY." (CallId identifier)
>    Called: "0033912312312" (calling number)
>    Calling: "0033912312312" (L'appelant)
>    Cseq: "181 REGISTER" (Le code CSeq du paquet SIP)
>    DateStart: Thu Mar 05 2015 12:44:30 GMT+0100 (CET) (La date)
>    Dialed: "0033912312312" (Le numéro composé)
>    Event: "registered" (Le type d'évenement)
>    Protocol: "sip" (Le type de protocole, sip ou mgcp)
>    RelevantInfo: "" (Information importante)
>    Ts: 1425554670.102
>    TsGet: 1425554670238926800 (Le timestamp de l'évenement en nanoseconde)
>}
>Date: "2015-03-05T12:24:30.255954 (CET)"
>Details: {
>    Description: "Gaelle Becquet" (Description du numéro OVH)
>    Id: "295670" (Identifiant de la ligne du numéro OVH)
>    IdBillingAccount: "59415" (Identifiant du groupe du numéro OVH)
>    SimultaneousLine: "2" (Nombre de lignes simultannées)
>    Type: "sipCirpack" (Type de ligne)
>}
>Event: "registered" (Le type d'évenement)
>Ressource: "0033912312312" (Le numéro OVH)
>Service: "sip" (Le protocole)
>Timestamp: 1425554670255954700 (Le timestamp de l'évenement en nanoseconde)
>Token: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" (Le token)


Interfaces
==========

CTI Dashboard
--------------

"Configuration => Appel du CGI"

Then specify the CGI URL and the execution type. Some dynamic values can be specified in the URL:

* *CALLING* => Calling number
* *CALLED* => Called number
* *EVENT* => Event name

Example : http://monsite.com?number=*CALLING*

Related Links
=============

* **API endpoint**: https://events.voip.ovh.net/
* **Live demo**: https://events.voip.ovh.net/demo/cti
* **Documentation**: [French] http://www.ovhtelecom.fr/pdf/telephony/guides/g1725.cti
* **Official website**: [French] https://www.ovhtelecom.fr/telephonie/services_inclus/

License
=======

MIT
