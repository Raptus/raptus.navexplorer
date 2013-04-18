Introduction
============

This plone product has been developed to support customers and webmasters in keeping an overview of their plone site and helping them control and manipulate it. The complete content of the plone site is represented as a structured tree. This tree is presented in a separated frame not to compromise the display of the plone site itself. In addition, much information is shown for each content-type.

To allow easy manipulation of a content item, all the regular actions are accessible in a context menu available on the repsective node of the tree. With only a few mouse clicks one can navigate miscellaneous views.

The tree supports **drag&drop**, allowing single or multiple content-types to be moved into others.


User manual and features
========================

:Single click:          Display information about the selected content.

:Double click:          Open content in the right frame.

:Right click:           Open context menu with additional actions.

:Arrow keys:            Navigate tree and open/close treenodes.

:Enter key:             Open highlighted content in the right frame.

:Drag and Drop:         Move one or multiple treenodes into another.

:Multiselection:        Select desired treenodes by left-click holding the 'shift' or 'alt' key pressed.


Supported Languages
===================
 * English
 * German
 * French
 * Italian


Developer's Manual
==================

Context menu
------------

The default context menu for archetypes shows the Plone menu named "plone_contentmenu". To customize
this context menu create a new Adapter implementing IContextMenu.


Accordion
---------

The additional information on any content-type is displayed in a separated box. For more
information please read the interface description: IAccordionItem.


Logo change
-----------
Change the logo by editing the settings in portal_properties at raptus_navexplorer/additional_development_info


Future features
===============
- nothing at the moment


Tests
=====
Currently, there are no automated tests. This project was created using Firefox 5.


Copyright and credits
=====================

raptus.navexplorer is copyright 2011-2012 by raptus ag, and is licensed under the GPL.
See LICENSE.txt for details.

.. _raptus: http://www.raptus.com/
